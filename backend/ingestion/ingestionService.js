'use strict';

require('dotenv').config();
const crypto  = require('crypto');
const logger  = require('../utils/logger');
const db      = require('../db/supabase');
const cache   = require('../utils/cache');
const { fromApiFootball, fromFootballData, fromTheSports } = require('../normalizer');
const fdFetcher = require('./footballDataFetcher');
const apiFetcher = require('./apiFootballFetcher');
const theSportsFetcher = require('./theSportsFetcher');
const { validateNormalizedMatch } = require('../normalizer/validators');

// New production services
const healthManager = require('../services/healthManager');
const diffEngine = require('../services/diffEngine');
const idempotency = require('../services/idempotencyService');
const queueService = require('../services/queueService');
const batchAggregator = require('../services/batchAggregator');

// Track last-seen state per match for change detection
const matchStateCache = new Map(); // match_external_id → full last normalized state

/**
 * Core ingestion cycle. Called by the cron runner every 30–60s.
 */
async function runIngestionCycle() {
  logger.info('[Ingestion] Starting cycle…');
  const startedAt = Date.now();

  let rawMatches = [];
  let source = healthManager.getActiveProvider();

  // Fetch helper with health tracking and circuit breaker safety
  async function fetchWithCircuitBreaker(provider) {
    const started = Date.now();
    try {
      let matches = [];
      if (provider === 'thesports') {
        matches = await theSportsFetcher.fetchMatches();
      } else if (provider === 'api_football') {
        matches = await apiFetcher.fetchLiveMatches();
      } else if (provider === 'football_data') {
        matches = await fdFetcher.fetchMatches();
      }
      healthManager.recordSuccess(provider, Date.now() - started);
      return matches;
    } catch (err) {
      healthManager.recordFailure(provider);
      throw err;
    }
  }

  // Attempt fetch with fallback priorities (Strict Production Failover Order)
  try {
    rawMatches = await fetchWithCircuitBreaker(source);
    logger.info(`[Ingestion] Provider ${source} successfully returned ${rawMatches.length} matches`);
  } catch (err) {
    logger.warn(`[Ingestion] Primary provider ${source} failed: ${err.message} — trying fallbacks`);
    const fallbacks = ['thesports', 'api_football', 'football_data'].filter(p => p !== source);
    let success = false;
    
    for (const fallback of fallbacks) {
      const metrics = healthManager.getMetrics()[fallback];
      if (metrics.state === 'OPEN') continue; // Skip OPEN circuits in cooldown
      
      try {
        logger.info(`[Ingestion] Switching fallback to: ${fallback}`);
        rawMatches = await fetchWithCircuitBreaker(fallback);
        source = fallback;
        success = true;
        break;
      } catch (fErr) {
        logger.warn(`[Ingestion] Fallback ${fallback} failed: ${fErr.message}`);
      }
    }
    
    if (!success) {
      logger.error('[Ingestion] All primary and fallback fetch attempts failed in this cycle.');
      return;
    }
  }

  // ---- Step 2: Normalize + diff + enqueue queue operations --------------------
  let updated = 0;
  let skipped = 0;

  for (const raw of rawMatches) {
    try {
      const normalized = source === 'thesports'
        ? fromTheSports(raw)
        : source === 'api_football'
        ? fromApiFootball(raw)
        : fromFootballData(raw);

      // Validate the normalized payload before proceeding with change detection or persistence
      if (!validateNormalizedMatch(normalized)) {
        logger.warn(`[Ingestion] Match payload failed validation screening. Skipping match ${normalized?.external_id || 'unknown'}`);
        continue;
      }

      const externalId  = normalized.external_id;
      const newHash     = normalized._eventHash;

      // Recover previous state from memory map or persistent cache (survives worker restart)
      let previousState = matchStateCache.get(externalId);
      if (!previousState) {
        previousState = await cache.get(`match:state:${externalId}`);
        if (previousState) {
          matchStateCache.set(externalId, previousState);
        }
      }

      // Generate a unified state signature capturing status, minute, scores, and event list hash
      const stateStr = `${normalized.status}:${normalized.minute}:${normalized.home_score}:${normalized.away_score}:${newHash}`;
      const stateHash = crypto.createHash('md5').update(stateStr).digest('hex');
      const cacheKey = `match:state_hash:${externalId}`;

      const cachedHash = await cache.get(cacheKey);
      if (cachedHash === stateHash) {
        logger.debug(`[Ingestion] Match ${externalId} (${normalized.home_team} vs ${normalized.away_team}) state unchanged. Skipping processing.`);
        skipped++;
        continue;
      }

      logger.info(`[Ingestion] Match ${externalId} changed (${previousState ? 'updating' : 'new'}). Diffing states.`);

      // 1. Event Diff Engine
      const diffEvents = diffEngine.diffMatchStates(externalId, previousState, normalized, source);

      // 2. Idempotency & Deduplication filter
      const newNonDuplicateEvents = [];
      for (const ev of diffEvents) {
        const isDup = await idempotency.checkAndMarkDuplicate(
          ev.match_id,
          ev.type === 'NEW_EVENT' ? ev.payload.type : ev.type,
          ev.type === 'NEW_EVENT' ? ev.payload.minute : ev.payload.minute || 0,
          ev.type === 'NEW_EVENT' ? ev.payload.player : '',
          source
        );
        if (!isDup) {
          newNonDuplicateEvents.push(ev);
        }
      }

      // 3. Real-Time Batch Aggregator buffering
      const stateDiff = {};
      let hasStateChanges = false;

      if (previousState) {
        if (normalized.home_score !== previousState.home_score) { stateDiff.home_score = normalized.home_score; hasStateChanges = true; }
        if (normalized.away_score !== previousState.away_score) { stateDiff.away_score = normalized.away_score; hasStateChanges = true; }
        if (normalized.status !== previousState.status) { stateDiff.status = normalized.status; hasStateChanges = true; }
        if (normalized.minute !== previousState.minute) { stateDiff.minute = normalized.minute; hasStateChanges = true; }
      } else {
        // First cycle: treat as setup state change
        stateDiff.home_score = normalized.home_score;
        stateDiff.away_score = normalized.away_score;
        stateDiff.status = normalized.status;
        stateDiff.minute = normalized.minute;
        hasStateChanges = true;
      }

      if (newNonDuplicateEvents.length > 0 || hasStateChanges) {
        batchAggregator.addEvents(externalId, newNonDuplicateEvents, stateDiff);
      }

      // 4. Enqueue persistence job (Decoupled DB Operations)
      const { _meta, events, _eventHash, ...matchRow } = normalized;
      queueService.enqueue('PERSIST_MATCH', {
        matchRow,
        meta: _meta,
        events,
        newHash,
        previousHash: previousState?._eventHash || null,
        newDiffEvents: newNonDuplicateEvents
      });

      // Update local memory and persistent cache states
      const finalState = {
        ...normalized,
        _eventHash: newHash
      };
      matchStateCache.set(externalId, finalState);
      await cache.set(`match:state:${externalId}`, finalState, 86400);
      await cache.set(cacheKey, stateHash, 86400);

      updated++;
    } catch (err) {
      logger.error(`[Ingestion] Failed to process match: ${err.message}`, { stack: err.stack });
    }
  }

  const elapsed = Date.now() - startedAt;
  logger.info(`[Ingestion] Cycle complete in ${elapsed}ms — updated: ${updated}, enqueued: ${updated}, skipped: ${skipped}`);
}

module.exports = { runIngestionCycle };

