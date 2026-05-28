'use strict';

/**
 * Ingestion runner / cron daemon.
 * Stands as a standalone worker process executing the ingestion flow
 * on a dynamic interval to optimize API quota costs.
 */

require('dotenv').config();
const { runIngestionCycle } = require('./ingestionService');
const cache = require('../utils/cache');
const db = require('../db/supabase');
const logger = require('../utils/logger');

let isRunning = false;
let timeoutId = null;

async function executeCycle() {
  if (isRunning) {
    logger.warn('[Ingestion Runner] Previous cycle is still running. Skipping to prevent overlaps.');
    return;
  }

  isRunning = true;
  try {
    await runIngestionCycle();
  } catch (err) {
    logger.error(`[Ingestion Runner] Cycle failed: ${err.message}`, { stack: err.stack });
  } finally {
    isRunning = false;
  }
}

/**
 * Queries the database for today's matches to dynamically calculate the next polling delay.
 * Saves API quota costs by slowing down the loop during inactive periods.
 *
 * @returns {Promise<number>} Sleep interval in seconds
 */
async function getDynamicIntervalSeconds() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const matches = await db.query(d =>
      d.from('matches')
        .select('status, start_time')
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
    );

    if (!matches || matches.length === 0) {
      logger.info('[Ingestion Scheduler] No matches scheduled for today. Defaulting to 15m polling.');
      return 900; // 15 minutes (no matches today)
    }

    let hasLive = false;
    let hasHT = false;
    let hasNearKickoff = false;

    const now = Date.now();
    for (const m of matches) {
      if (m.status === 'LIVE') hasLive = true;
      if (m.status === 'HT') hasHT = true;
      if (m.status === 'NS' && m.start_time) {
        const diffMs = new Date(m.start_time).getTime() - now;
        const diffMins = diffMs / 60000;
        if (diffMins > 0 && diffMins <= 30) {
          hasNearKickoff = true;
        }
      }
    }

    if (hasLive) {
      logger.debug('[Ingestion Scheduler] Active matches are LIVE. Setting high-frequency 10s polling.');
      return 10;
    }
    if (hasHT) {
      logger.debug('[Ingestion Scheduler] Active matches are at Half Time. Setting 30s polling.');
      return 30;
    }
    if (hasNearKickoff) {
      logger.debug('[Ingestion Scheduler] Matches starting within 30 minutes. Setting 60s polling.');
      return 60;
    }

    logger.debug('[Ingestion Scheduler] All matches today are finished (FT) or kickoff is >30m away. Setting low-frequency 15m polling.');
    return 900; // 15 minutes
  } catch (err) {
    logger.warn(`[Ingestion Scheduler] Dynamic interval computation failed: ${err.message}. Defaulting to 60s.`);
    return 60;
  }
}

async function scheduleNextRun() {
  const delaySeconds = await getDynamicIntervalSeconds();
  logger.info(`[Ingestion Runner] Polling cycle complete. Next cycle scheduled in ${delaySeconds} seconds.`);
  
  timeoutId = setTimeout(async () => {
    await executeCycle();
    scheduleNextRun();
  }, delaySeconds * 1000);
}

async function start() {
  logger.info(`[Ingestion Runner] Ingestion service starting up in production mode...`);

  // Initialize Cache (Redis / Memory) before starting loop
  await cache.initRedis();

  // Start batch aggregator loop
  const batchAggregator = require('../services/batchAggregator');
  batchAggregator.start();

  // Run immediately on start
  await executeCycle();

  // Start dynamic scheduling loop
  await scheduleNextRun();
}

// Catch unhandled exceptions and promise rejections to prevent process exit in production
process.on('uncaughtException', (err) => {
  logger.error('[Ingestion Runner] Uncaught Exception detected:', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Ingestion Runner] Unhandled Promise Rejection detected:', { reason: String(reason) });
});

// Graceful shutdown handling
function shutdown() {
  logger.info('Shutting down runner gracefully...');
  if (timeoutId) clearTimeout(timeoutId);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch(err => {
  logger.error(`[Ingestion Runner] Startup failed: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
