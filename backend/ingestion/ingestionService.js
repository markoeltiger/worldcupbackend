'use strict';

require('dotenv').config();
const crypto  = require('crypto');
const logger  = require('../utils/logger');
const db      = require('../db/supabase');
const cache   = require('../utils/cache');
const { fromApiFootball, fromSportsDB, fromFootballData } = require('../normalizer');
const fdFetcher = require('./footballDataFetcher');
const apiFetcher = require('./apiFootballFetcher');
const sdbFetcher = require('./sportsDBFetcher');
const scraper    = require('../scraper');

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
      if (provider === 'football_data') {
        matches = await fdFetcher.fetchMatches();
      } else if (provider === 'api_football') {
        matches = await apiFetcher.fetchLiveMatches();
      } else if (provider === 'sportsdb') {
        matches = await sdbFetcher.fetchLiveMatches();
      } else if (provider === 'scraper') {
        matches = await scraper.scrapeLiveMatches();
      }
      healthManager.recordSuccess(provider, Date.now() - started);
      return matches;
    } catch (err) {
      healthManager.recordFailure(provider);
      throw err;
    }
  }

  // Attempt fetch with fallback priorities
  try {
    rawMatches = await fetchWithCircuitBreaker(source);
    logger.info(`[Ingestion] Provider ${source} successfully returned ${rawMatches.length} matches`);
  } catch (err) {
    logger.warn(`[Ingestion] Primary provider ${source} failed: ${err.message} — trying fallbacks`);
    const fallbacks = ['football_data', 'api_football', 'sportsdb', 'scraper'].filter(p => p !== source);
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
      const normalized = source === 'football_data'
        ? fromFootballData(raw)
        : source === 'api_football'
        ? fromApiFootball(raw)
        : source === 'sportsdb'
        ? fromSportsDB(raw)
        : raw; // scraper already normalized

      const externalId  = normalized.external_id;
      const newHash     = normalized._eventHash;
      const previousState = matchStateCache.get(externalId);

      // Skip if nothing changed
      if (previousState && previousState._eventHash === newHash && normalized.status !== 'LIVE') {
        skipped++;
        continue;
      }

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
      if (newNonDuplicateEvents.length > 0) {
        const stateDiff = {};
        if (normalized.home_score !== previousState?.home_score) stateDiff.home_score = normalized.home_score;
        if (normalized.away_score !== previousState?.away_score) stateDiff.away_score = normalized.away_score;
        if (normalized.status !== previousState?.status) stateDiff.status = normalized.status;
        if (normalized.minute !== previousState?.minute) stateDiff.minute = normalized.minute;

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

      // Update local state Map
      matchStateCache.set(externalId, {
        ...normalized,
        _eventHash: newHash
      });
      updated++;
    } catch (err) {
      logger.error(`[Ingestion] Failed to process match: ${err.message}`, { stack: err.stack });
    }
  }

  const elapsed = Date.now() - startedAt;
  logger.info(`[Ingestion] Cycle complete in ${elapsed}ms — updated: ${updated}, enqueued: ${updated}, skipped: ${skipped}`);
}

module.exports = { runIngestionCycle };

