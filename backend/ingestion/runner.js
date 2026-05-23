'use strict';

/**
 * Ingestion runner / cron daemon.
 * Can be run as a standalone worker process (suitable for Render / Railway / Docker)
 * or triggered via scheduling. Runs the loop on configured intervals.
 */

require('dotenv').config();
const cron = require('node-cron');
const { runIngestionCycle } = require('./ingestionService');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const INTERVAL_SECONDS = parseInt(process.env.INGESTION_INTERVAL_SECONDS, 10) || 30;

let isRunning = false;

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

async function start() {
  logger.info(`[Ingestion Runner] Ingestion service starting up...`);
  logger.info(`[Ingestion Runner] Running every ${INTERVAL_SECONDS} seconds.`);

  // Initialize Cache (Redis / Memory) before starting loop
  await cache.initRedis();

  // Start batch aggregator loop
  const batchAggregator = require('../services/batchAggregator');
  batchAggregator.start();

  // Run immediately on start
  await executeCycle();


  // Setup periodic scheduler (node-cron expression or interval fallback)
  if (INTERVAL_SECONDS === 60) {
    // Exact minute boundary alignment using cron
    cron.schedule('* * * * *', async () => {
      logger.debug('[Ingestion Runner] Minute trigger received.');
      await executeCycle();
    });
  } else {
    // Sub-minute custom interval loops
    setInterval(async () => {
      logger.debug('[Ingestion Runner] Interval trigger received.');
      await executeCycle();
    }, INTERVAL_SECONDS * 1000);
  }
}

// Catch unhandled exceptions and promise rejections to prevent process exit in production
process.on('uncaughtException', (err) => {
  logger.error('[Ingestion Runner] Uncaught Exception detected:', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Ingestion Runner] Unhandled Promise Rejection detected:', { reason: String(reason) });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down runner gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down runner gracefully...');
  process.exit(0);
});

start().catch(err => {
  logger.error(`[Ingestion Runner] Startup failed: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

