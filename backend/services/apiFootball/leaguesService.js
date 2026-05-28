'use strict';

/**
 * services/apiFootball/leaguesService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Football leagues service with caching and normalization.
 */

const { executeRequest } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Fetch all leagues
 * TTL: 24 hours
 */
async function getAllLeagues() {
  const cacheKey = 'apifootball:leagues:all';
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug('[API-Football] Fetching all leagues');
    const leagues = await executeRequest('/leagues');
    return leagues;
  }, 86400); // 24 hours TTL
}

/**
 * Fetch league by ID
 * TTL: 24 hours
 */
async function getLeagueById(leagueId) {
  const cacheKey = `apifootball:leagues:${leagueId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching league: ${leagueId}`);
    const leagues = await executeRequest('/leagues', { id: leagueId });
    return leagues.length > 0 ? leagues[0] : null;
  }, 86400); // 24 hours TTL
}

/**
 * Fetch leagues for a country
 * TTL: 24 hours
 */
async function getLeaguesByCountry(country) {
  const cacheKey = `apifootball:leagues:country:${country}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching leagues for country: ${country}`);
    const leagues = await executeRequest('/leagues', { country });
    return leagues;
  }, 86400); // 24 hours TTL
}

/**
 * Fetch current season for a league
 * TTL: 24 hours
 */
async function getCurrentSeason(leagueId) {
  const cacheKey = `apifootball:leagues:${leagueId}:current-season`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching current season for league: ${leagueId}`);
    const leagues = await executeRequest('/leagues', { id: leagueId, current: 'true' });
    return leagues.length > 0 ? leagues[0] : null;
  }, 86400); // 24 hours TTL
}

module.exports = {
  getAllLeagues,
  getLeagueById,
  getLeaguesByCountry,
  getCurrentSeason,
};
