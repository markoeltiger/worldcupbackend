'use strict';

/**
 * Cost Optimization Service
 * =========================
 * Aggressive cost control for API usage.
 * Minimizes unnecessary API calls and optimizes polling.
 */

const logger = require('../utils/logger');
const cacheManager = require('../cache/footballCacheManager');

// Cost optimization configuration
const COST_CONFIG = {
  maxApiCallsPerMinute: 60,
  maxApiCallsPerHour: 1000,
  dailyApiQuota: 10000,
  pollingThreshold: 10, // Skip polling if fewer than this many live matches
  inactivePollingSkip: true, // Skip polling for inactive leagues
  batchRequestSize: 10, // Batch multiple requests when possible
};

class CostOptimizer {
  constructor() {
    this.apiCallCount = 0;
    this.apiCallHistory = [];
    this.pollingStats = {
      totalPolls: 0,
      skippedPolls: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.inactiveLeagues = new Set();
  }

  /**
   * Check if API call should be made
   */
  shouldMakeApiCall() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Count calls in last minute
    const callsLastMinute = this.apiCallHistory.filter(t => t > oneMinuteAgo).length;
    if (callsLastMinute >= COST_CONFIG.maxApiCallsPerMinute) {
      logger.warn('[CostOptimizer] Rate limit reached (per minute)');
      return false;
    }

    // Count calls in last hour
    const callsLastHour = this.apiCallHistory.filter(t => t > oneHourAgo).length;
    if (callsLastHour >= COST_CONFIG.maxApiCallsPerHour) {
      logger.warn('[CostOptimizer] Rate limit reached (per hour)');
      return false;
    }

    // Check daily quota
    const callsToday = this.apiCallHistory.length;
    if (callsToday >= COST_CONFIG.dailyApiQuota) {
      logger.error('[CostOptimizer] Daily API quota exceeded');
      return false;
    }

    return true;
  }

  /**
   * Record API call
   */
  recordApiCall() {
    this.apiCallCount++;
    this.apiCallHistory.push(Date.now());
    
    // Clean up old history (older than 24 hours)
    const oneDayAgo = Date.now() - 86400000;
    this.apiCallHistory = this.apiCallHistory.filter(t => t > oneDayAgo);
  }

  /**
   * Should skip polling for this match
   */
  shouldSkipPolling(match) {
    // Skip completed matches
    if (match.status === 'FT' || match.status === 'POSTPONED') {
      return true;
    }

    // Skip matches in inactive leagues
    if (match.league && this.inactiveLeagues.has(match.league.id)) {
      return true;
    }

    return false;
  }

  /**
   * Should skip polling for this league
   */
  shouldSkipLeaguePolling(leagueId, leagueActivity) {
    // Skip if league has been inactive for a while
    if (leagueActivity && leagueActivity.lastActivity) {
      const hoursSinceActivity = (Date.now() - leagueActivity.lastActivity) / 3600000;
      if (hoursSinceActivity > 24 && COST_CONFIG.inactivePollingSkip) {
        this.inactiveLeagues.add(leagueId);
        logger.info(`[CostOptimizer] Marked league ${leagueId} as inactive`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get dynamic polling interval
   */
  getDynamicPollingInterval(matchCount, isWorldCup = false) {
    // World Cup matches always get fastest interval
    if (isWorldCup) {
      return 5000; // 5 seconds
    }

    // Fewer matches = slower polling
    if (matchCount === 0) {
      return 60000; // 1 minute
    } else if (matchCount < 5) {
      return 30000; // 30 seconds
    } else if (matchCount < 10) {
      return 15000; // 15 seconds
    } else {
      return 10000; // 10 seconds
    }
  }

  /**
   * Optimize polling based on current state
   */
  optimizePolling(matches) {
    this.pollingStats.totalPolls++;

    // Filter out matches that should be skipped
    const activeMatches = matches.filter(m => !this.shouldSkipPolling(m));
    const skippedCount = matches.length - activeMatches.length;

    if (skippedCount > 0) {
      this.pollingStats.skippedPolls += skippedCount;
      logger.debug(`[CostOptimizer] Skipped polling for ${skippedCount} inactive matches`);
    }

    // If very few matches, skip polling entirely
    if (activeMatches.length < COST_CONFIG.pollingThreshold) {
      this.pollingStats.skippedPolls++;
      logger.debug(`[CostOptimizer] Skipping polling - only ${activeMatches.length} active matches`);
      return { shouldPoll: false, matches: activeMatches };
    }

    return { shouldPoll: true, matches: activeMatches };
  }

  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.pollingStats.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss() {
    this.pollingStats.cacheMisses++;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate() {
    const total = this.pollingStats.cacheHits + this.pollingStats.cacheMisses;
    if (total === 0) return 0;
    return (this.pollingStats.cacheHits / total) * 100;
  }

  /**
   * Mark league as active
   */
  markLeagueActive(leagueId) {
    this.inactiveLeagues.delete(leagueId);
  }

  /**
   * Mark league as inactive
   */
  markLeagueInactive(leagueId) {
    this.inactiveLeagues.add(leagueId);
  }

  /**
   * Get cost statistics
   */
  getStats() {
    return {
      apiCallCount: this.apiCallCount,
      apiCallsLastMinute: this.apiCallHistory.filter(t => t > Date.now() - 60000).length,
      apiCallsLastHour: this.apiCallHistory.filter(t => t > Date.now() - 3600000).length,
      apiCallsToday: this.apiCallHistory.length,
      dailyQuotaRemaining: COST_CONFIG.dailyApiQuota - this.apiCallHistory.length,
      polling: this.pollingStats,
      cacheHitRate: this.getCacheHitRate(),
      inactiveLeagues: Array.from(this.inactiveLeagues),
      config: COST_CONFIG,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.apiCallCount = 0;
    this.apiCallHistory = [];
    this.pollingStats = {
      totalPolls: 0,
      skippedPolls: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    logger.info('[CostOptimizer] Statistics reset');
  }
}

module.exports = new CostOptimizer();
