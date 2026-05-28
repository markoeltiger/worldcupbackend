'use strict';

/**
 * services/apiFootball/standingsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Football standings service with caching and normalization.
 */

const { executeRequest } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Fetch league standings
 * TTL: 6 hours
 */
async function getStandings(leagueId, season) {
  const cacheKey = `apifootball:standings:${leagueId}:${season}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching standings for league: ${leagueId}, season: ${season}`);
    const standings = await executeRequest('/standings', { league: leagueId, season });
    return standings;
  }, 21600); // 6 hours TTL
}

module.exports = {
  getStandings,
};
