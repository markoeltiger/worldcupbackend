'use strict';

const db = require('../db/supabase');
const logger = require('../utils/logger');
const { triggerMatchNotifications } = require('../notifications/fcmService');
const { generateLiveInsight } = require('../ai/insightsService');

// In-Memory Queue State
const queue = [];
const dlq = [];
let isProcessing = false;
let totalProcessed = 0;
let totalFailed = 0;

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

/**
 * Enqueue a new persistence job.
 *
 * @param {string} type - 'PERSIST_MATCH'
 * @param {object} payload - Match ingestion data
 */
function enqueue(type, payload) {
  const job = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    payload,
    attempts: 0,
    enqueuedAt: Date.now()
  };
  
  queue.push(job);
  logger.info(`[Queue] Enqueued job ${job.id} of type ${type}. Queue size: ${queue.length}`);
  
  // Kick off background processing loop (don't block the caller)
  triggerProcessing();
}

function triggerProcessing() {
  if (isProcessing) return;
  isProcessing = true;
  processNextJob();
}

async function processNextJob() {
  if (queue.length === 0) {
    isProcessing = false;
    return;
  }

  const job = queue.shift();
  job.attempts++;

  try {
    logger.debug(`[Queue] Processing job ${job.id} (attempt ${job.attempts}/${MAX_RETRIES})`);
    
    if (job.type === 'PERSIST_MATCH') {
      await processPersistMatch(job.payload);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }

    totalProcessed++;
    logger.info(`[Queue] Job ${job.id} completed successfully.`);
    
    // Process next job immediately
    setImmediate(processNextJob);
  } catch (err) {
    logger.warn(`[Queue] Job ${job.id} failed: ${err.message}`);
    
    if (job.attempts < MAX_RETRIES) {
      // Exponential backoff delay calculation
      const backoff = BASE_BACKOFF_MS * Math.pow(2, job.attempts - 1);
      logger.warn(`[Queue] Re-enqueuing job ${job.id} with ${backoff}ms delay...`);
      
      setTimeout(() => {
        queue.push(job);
        triggerProcessing();
      }, backoff);
      
      setImmediate(processNextJob);
    } else {
      // All attempts exhausted, move to Dead Letter Queue (DLQ)
      totalFailed++;
      job.error = err.message;
      job.failedAt = Date.now();
      dlq.push(job);
      logger.error(`[Queue] Job ${job.id} exhausted all retries. Moved to DLQ.`);
      
      setImmediate(processNextJob);
    }
  }
}

async function processPersistMatch(payload) {
  const { matchRow, meta, events, newHash, previousHash, newDiffEvents } = payload;

  // 1. Persist League & Team metadata
  if (meta) {
    if (meta.league_external_id) {
      await db.upsertLeague({
        external_id: meta.league_external_id,
        name: matchRow.league,
        country: meta.country,
        logo_url: meta.league_logo,
        season: meta.season,
      });
    }
    if (meta.home_team_external_id) {
      await db.upsertTeam({
        external_id: meta.home_team_external_id,
        name: matchRow.home_team,
        logo_url: meta.home_team_logo,
      });
    }
    if (meta.away_team_external_id) {
      await db.upsertTeam({
        external_id: meta.away_team_external_id,
        name: matchRow.away_team,
        logo_url: meta.away_team_logo,
      });
    }
  }

  // 2. Upsert Match details
  const persistedMatch = await db.upsertMatch(matchRow);

  // 3. Upsert Timeline Events
  if (events && events.length > 0) {
    for (const ev of events) {
      await db.upsertEvent({ ...ev, match_id: persistedMatch.id });
    }
  }

  // 4. Update live state cache if match is active; delete if it has finished
  const isActive = persistedMatch.status === 'LIVE' || persistedMatch.status === 'HT';
  if (isActive) {
    await db.upsertLiveState(
      persistedMatch.id,
      { ...matchRow, events },
      newHash
    );
  } else {
    // Game completed or postponed - remove from live state cache to control API/polling footprint
    await db.query((client) =>
      client.from('live_match_state').delete().eq('match_id', persistedMatch.id)
    ).catch((err) => {
      // Maybe not present, ignore or log silently
      logger.debug(`[Queue] Failed to delete completed match from live state cache: ${err.message}`);
    });
  }

  // 5. Automate Prediction scoring immediately on FT transition
  if (persistedMatch.status === 'FT') {
    logger.info(`[Queue] Match ${persistedMatch.id} finished (FT). Triggering prediction scoring...`);
    const predictionsService = require('./predictionsService');
    await predictionsService.scorePredictionsForMatch(persistedMatch.id).catch((err) => {
      logger.error(`[Queue] Failed scoring predictions for match ${persistedMatch.id}: ${err.message}`, { stack: err.stack });
    });
  }

  // 5. Trigger notifications & AI summaries asynchronously if change events are detected
  if (newDiffEvents && newDiffEvents.length > 0) {
    const newTimelineEvents = newDiffEvents.filter(ev => ev.type === 'NEW_EVENT').map(ev => ev.payload);
    if (newTimelineEvents.length > 0) {
      // Trigger FCM push notification alerts
      await triggerMatchNotifications(persistedMatch, newTimelineEvents).catch((e) =>
        logger.error(`[Queue FCM] Failed to trigger notification: ${e.message}`)
      );
      // Queue AI live commentary insight updates
      generateLiveInsight(persistedMatch, events).catch((e) =>
        logger.error(`[Queue AI] Failed live insight: ${e.message}`)
      );
    }
  }
}

/**
 * Returns queue telemetry metrics.
 *
 * @returns {object}
 */
function getQueueStats() {
  return {
    queueLength: queue.length,
    dlqLength: dlq.length,
    totalProcessed,
    totalFailed,
    isProcessing,
    dlqEntries: dlq.slice(-20) // return last 20 failed jobs for monitoring
  };
}

module.exports = {
  enqueue,
  getQueueStats
};
