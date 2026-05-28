'use strict';

/**
 * api/routes/system.js
 * ─────────────────────────────────────────────────────────────────────────────
 * System health and telemetry endpoints.
 */

const { Router } = require('express');
const healthManager = require('../../services/healthManager');
const queueService = require('../../services/queueService');
const batchAggregator = require('../../services/batchAggregator');
const { getHealthMetrics } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');

const router = Router();

// GET /api/v1/system/health - Returns detailed provider metrics and circuit states
router.get('/health', (req, res) => {
  try {
    const metrics = healthManager.getMetrics();
    res.json({
      status: 'success',
      data: metrics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/system/provider-health - Returns API-Football provider health and telemetry
router.get('/provider-health', (req, res) => {
  try {
    const providerMetrics = getHealthMetrics();
    
    // Calculate cache hit rate (simplified)
    const cacheStats = {
      redisAvailable: cache.redisClient !== null,
      // Additional cache metrics can be added here
    };
    
    res.json({
      status: 'success',
      data: {
        provider: providerMetrics,
        cache: cacheStats,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/system/queue - Returns ingestion queue and DLQ metrics
router.get('/queue', (req, res) => {
  try {
    const stats = queueService.getQueueStats();
    res.json({
      status: 'success',
      data: stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/system/batches - Returns recent micro-batches flushed
router.get('/batches', (req, res) => {
  try {
    const batches = batchAggregator.getRecentBatches();
    res.json({
      status: 'success',
      data: batches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
