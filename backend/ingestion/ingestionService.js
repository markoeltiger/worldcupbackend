'use strict';

require('dotenv').config();
const crypto  = require('crypto');
const logger  = require('../utils/logger');
const db      = require('../db/supabase');
const cache   = require('../utils/cache');
const { fromApiFootball } = require('../normalizer');
const apiFootballService = require('../services/apiFootball');
const { validateNormalizedMatch } = require('../normalizer/validators');

// New production services
const healthManager = require('../services/healthManager');
const diffEngine = require('../services/diffEngine');
const idempotency = require('../services/idempotencyService');
const queueService = require('../services/queueService');
const batchAggregator = require('../services/batchAggregator');
const fcmService = require('../services/fcm');

// Track last-seen state per match for change detection
const matchStateCache = new Map(); // match_external_id → full last normalized state

/**
 * Core ingestion cycle. Called by the cron runner every 30–60s.
 * Uses API-Football ONLY - no fallbacks, no mock data.
 */
async function runIngestionCycle() {
  logger.info('[Ingestion] Starting cycle…');
  const startedAt = Date.now();

  let rawMatches = [];
  const source = 'api_football';

  // Fetch helper with health tracking and circuit breaker safety
  async function fetchWithCircuitBreaker() {
    const started = Date.now();
    try {
      const matches = await apiFootballService.live.getLiveMatches();
      healthManager.recordSuccess(source, Date.now() - started);
      return matches;
    } catch (err) {
      healthManager.recordFailure(source);
      throw err;
    }
  }

  // Attempt fetch - NO fallbacks, return error if API-Football fails
  try {
    rawMatches = await fetchWithCircuitBreaker();
    logger.info(`[Ingestion] API-Football successfully returned ${rawMatches.length} matches`);
  } catch (err) {
    logger.error(`[Ingestion] API-Football failed: ${err.message}. No fallbacks available. Skipping cycle.`);
    return;
  }

  // ---- Step 2: Normalize + diff + enqueue queue operations --------------------
  let updated = 0;
  let skipped = 0;

  for (const raw of rawMatches) {
    try {
      const normalized = fromApiFootball(raw);

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
      const diffEvents = diffEngine.diffMatchStates(externalId, previousState, normalized, 'api_football');

      // 1.5. FCM Notifications for major events
      for (const ev of diffEvents) {
        try {
          if (ev.type === 'NEW_EVENT') {
            const eventType = ev.payload.type;
            
            // Send goal notification
            if (eventType === 'goal') {
              await fcmService.sendGoalNotification(
                externalId,
                normalized.home_team,
                normalized.away_team,
                ev.payload.player || 'Unknown',
                ev.payload.minute || 0,
                normalized.home_score,
                normalized.away_score
              );
            }
            
            // Send card notification
            if (eventType === 'yellow_card' || eventType === 'red_card') {
              await fcmService.sendCardNotification(
                externalId,
                normalized.home_team,
                normalized.away_team,
                ev.payload.player || 'Unknown',
                eventType,
                ev.payload.minute || 0
              );
            }
          }
          
          // Send match start notification (when match transitions from NS to LIVE)
          if (ev.type === 'STATUS_CHANGE' && ev.payload.new_status === 'LIVE' && (!previousState || previousState.status === 'NS')) {
            await fcmService.sendMatchStartNotification(
              externalId,
              normalized.home_team,
              normalized.away_team
            );
          }
          
          // Send match end notification (when match transitions from LIVE to FT)
          if (ev.type === 'STATUS_CHANGE' && ev.payload.new_status === 'FT' && previousState && previousState.status === 'LIVE') {
            await fcmService.sendMatchEndNotification(
              externalId,
              normalized.home_team,
              normalized.away_team,
              normalized.home_score,
              normalized.away_score
            );
          }
        } catch (fcmErr) {
          logger.error(`[FCM] Failed to send notification for match ${externalId}: ${fcmErr.message}`);
        }
      }

      // 2. Idempotency & Deduplication filter
      const newNonDuplicateEvents = [];
      for (const ev of diffEvents) {
        const isDup = await idempotency.checkAndMarkDuplicate(
          ev.match_id,
          ev.type === 'NEW_EVENT' ? ev.payload.type : ev.type,
          ev.type === 'NEW_EVENT' ? ev.payload.minute : ev.payload.minute || 0,
          ev.type === 'NEW_EVENT' ? ev.payload.player : '',
          'api_football'
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
        newDiffEvents: newNonDuplicateEvents,
        source: 'api_football'
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

