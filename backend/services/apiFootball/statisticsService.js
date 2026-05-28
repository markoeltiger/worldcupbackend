'use strict';

/**
 * services/apiFootball/statisticsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Football statistics service with caching and normalization.
 */

const { executeRequest } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Fetch statistics for a fixture
 * TTL: 30 seconds during live matches, 1 hour for finished matches
 */
async function getStatistics(fixtureId) {
  const cacheKey = `apifootball:statistics:${fixtureId}`;
  
  // First check if match is live to determine TTL
  const fixture = await executeRequest('/fixtures', { id: fixtureId });
  if (fixture.length === 0) return null;
  
  const match = fixture[0];
  const status = match.fixture?.status?.short;
  const isLive = status === 'LIVE' || status === 'HT' || status === '1H' || status === '2H';
  const ttl = isLive ? 30 : 3600; // 30s if live, 1h if finished
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching statistics for fixture: ${fixtureId}`);
    const stats = await executeRequest('/fixtures/statistics', { fixture: fixtureId });
    return stats;
  }, ttl);
}

module.exports = {
  getStatistics,
};
