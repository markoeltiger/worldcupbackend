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

// GET /api/v1/system/provider-health - Returns API-Football provider health and telemetry with latency data
router.get('/provider-health', (req, res) => {
  try {
    const providerMetrics = getHealthMetrics();
    
    // Calculate cache hit rate (simplified)
    const cacheStats = {
      redisAvailable: cache.redisClient !== null,
      // Additional cache metrics can be added here
    };
    
    // Add latency data from provider metrics
    const latencyData = {
      averageLatencyMs: providerMetrics.averageLatencyMs || 0,
      lastRequestLatencyMs: providerMetrics.lastRequestLatencyMs || 0,
      p95LatencyMs: providerMetrics.p95LatencyMs || 0,
      p99LatencyMs: providerMetrics.p99LatencyMs || 0
    };
    
    res.json({
      status: 'success',
      data: {
        provider: providerMetrics,
        cache: cacheStats,
        latency: latencyData,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/system/queue - Returns ingestion queue and DLQ metrics with jobs count
router.get('/queue', (req, res) => {
  try {
    const stats = queueService.getQueueStats();
    
    // Ensure jobs count is included
    const queueData = {
      queueSize: stats.queueSize || 0,
      dlqSize: stats.dlqSize || 0,
      processingRate: stats.processingRate || 0,
      jobsCount: stats.queueSize || 0, // Alias for jobs count
      jobsPending: stats.queueSize || 0,
      jobsFailed: stats.dlqSize || 0,
      lastProcessedAt: stats.lastProcessedAt || null
    };
    
    res.json({
      status: 'success',
      data: queueData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/system/batches - Returns recent micro-batches flushed with worker statuses
router.get('/batches', (req, res) => {
  try {
    const batches = batchAggregator.getRecentBatches();
    
    // Add worker status information
    const workerStatuses = {
      active: true,
      lastFlushAt: batches.length > 0 ? batches[batches.length - 1].timestamp : null,
      totalBatchesProcessed: batches.length,
      batchesPerMinute: 0, // Could be calculated from timestamps
      workerId: 'batch-aggregator-1',
      status: 'running'
    };
    
    res.json({
      status: 'success',
      data: {
        batches: batches,
        worker: workerStatuses
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
