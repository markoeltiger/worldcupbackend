'use strict';

/**
 * Monitoring and Telemetry Service
 * ================================
 * System monitoring, metrics collection, and health tracking.
 */

const logger = require('../utils/logger');
const rapidApiProvider = require('../ingestion/providers/rapidApiFootballProvider');
const cacheManager = require('../cache/footballCacheManager');
const costOptimizer = require('./costOptimizer');
const realtimeEngine = require('./realtimeEngine');
const worldCupService = require('./worldCupPriorityService');
const healthManager = require('./healthManager');

class MonitoringService {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      dbWrites: 0,
      dbReads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      liveMatchesTracked: 0,
      eventsProcessed: 0,
    };
  }

  /**
   * Record request
   */
  recordRequest(success = true) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Record DB write
   */
  recordDbWrite() {
    this.metrics.dbWrites++;
  }

  /**
   * Record DB read
   */
  recordDbRead() {
    this.metrics.dbReads++;
  }

  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.metrics.cacheHits++;
    costOptimizer.recordCacheHit();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss() {
    this.metrics.cacheMisses++;
    costOptimizer.recordCacheMiss();
  }

  /**
   * Record live match tracked
   */
  recordLiveMatchTracked() {
    this.metrics.liveMatchesTracked++;
  }

  /**
   * Record event processed
   */
  recordEventProcessed() {
    this.metrics.eventsProcessed++;
  }

  /**
   * Get system health
   */
  async getHealth() {
    try {
      const providerHealth = rapidApiProvider.getHealth();
      const cacheStats = await cacheManager.getStats();
      const costStats = costOptimizer.getStats();
      const realtimeStatus = realtimeEngine.getStatus();
      const worldCupStatus = worldCupService.getStatus();
      const healthMetrics = healthManager.getMetrics();

      return {
        status: 'healthy',
        uptime: Date.now() - this.startTime,
        provider: providerHealth,
        cache: cacheStats,
        cost: costStats,
        realtime: realtimeStatus,
        worldCup: worldCupStatus,
        healthManager: healthMetrics,
      };
    } catch (error) {
      logger.error('[Monitoring] Error getting health:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    return {
      uptime: `${hours}h ${minutes}m`,
      uptimeMs: uptime,
      requests: {
        total: this.metrics.totalRequests,
        successful: this.metrics.successfulRequests,
        failed: this.metrics.failedRequests,
        successRate: this.metrics.totalRequests > 0 
          ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
          : '0%',
      },
      database: {
        writes: this.metrics.dbWrites,
        reads: this.metrics.dbReads,
      },
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
          ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2) + '%'
          : '0%',
      },
      liveMatches: {
        tracked: this.metrics.liveMatchesTracked,
        eventsProcessed: this.metrics.eventsProcessed,
      },
      cost: costOptimizer.getStats(),
    };
  }

  /**
   * Get provider status
   */
  getProviderStatus() {
    return {
      rapidapi: rapidApiProvider.getHealth(),
      healthManager: healthManager.getMetrics(),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      dbWrites: 0,
      dbReads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      liveMatchesTracked: 0,
      eventsProcessed: 0,
    };
    logger.info('[Monitoring] Metrics reset');
  }
}

module.exports = new MonitoringService();
