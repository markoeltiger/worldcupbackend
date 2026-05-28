'use strict';

/**
 * services/apiFootball/liveService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Football live matches service with caching and normalization.
 */

const { executeRequest } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Fetch all currently live matches
 * TTL: 10 seconds (realtime data)
 */
async function getLiveMatches() {
  const cacheKey = 'apifootball:live';
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug('[API-Football] Fetching live matches');
    const matches = await executeRequest('/fixtures', { live: 'all' });
    return matches;
  }, 10); // 10 seconds TTL for realtime
}

/**
 * Fetch live matches for a specific league
 * TTL: 10 seconds (realtime data)
 */
async function getLiveMatchesByLeague(leagueId) {
  const cacheKey = `apifootball:live:league:${leagueId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching live matches for league: ${leagueId}`);
    const matches = await executeRequest('/fixtures', { league: leagueId, live: 'all' });
    return matches;
  }, 10); // 10 seconds TTL for realtime
}

module.exports = {
  getLiveMatches,
  getLiveMatchesByLeague,
};
