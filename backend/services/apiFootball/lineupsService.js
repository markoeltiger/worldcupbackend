'use strict';

/**
 * services/apiFootball/lineupsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Football lineups service with caching and normalization.
 */

const { executeRequest } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Fetch lineups for a fixture
 * TTL: Until match finished (check match status before caching)
 */
async function getLineups(fixtureId) {
  const cacheKey = `apifootball:lineups:${fixtureId}`;
  
  // First check if match is finished to determine TTL
  const fixture = await executeRequest('/fixtures', { id: fixtureId });
  if (fixture.length === 0) return null;
  
  const match = fixture[0];
  const isFinished = match.fixture?.status?.short === 'FT';
  const ttl = isFinished ? 86400 : 300; // 24h if finished, 5 min if live
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching lineups for fixture: ${fixtureId}`);
    const lineups = await executeRequest('/fixtures/lineups', { fixture: fixtureId });
    return lineups;
  }, ttl);
}

module.exports = {
  getLineups,
};
