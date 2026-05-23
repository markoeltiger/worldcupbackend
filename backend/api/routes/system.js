'use strict';

const { Router } = require('express');
const healthManager = require('../../services/healthManager');
const queueService = require('../../services/queueService');
const batchAggregator = require('../../services/batchAggregator');

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
