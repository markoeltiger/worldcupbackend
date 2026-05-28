'use strict';

/**
 * services/apiFootball/teamsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Football teams service with caching and normalization.
 */

const { executeRequest } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Fetch team by ID
 * TTL: 24 hours
 */
async function getTeamById(teamId) {
  const cacheKey = `apifootball:teams:${teamId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching team: ${teamId}`);
    const teams = await executeRequest('/teams', { id: teamId });
    return teams.length > 0 ? teams[0] : null;
  }, 86400); // 24 hours TTL
}

/**
 * Fetch teams for a league
 * TTL: 24 hours
 */
async function getTeamsByLeague(leagueId, season) {
  const cacheKey = `apifootball:teams:league:${leagueId}:${season}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching teams for league: ${leagueId}, season: ${season}`);
    const teams = await executeRequest('/teams', { league: leagueId, season });
    return teams;
  }, 86400); // 24 hours TTL
}

/**
 * Search teams by name
 * TTL: 24 hours
 */
async function searchTeams(searchTerm) {
  const cacheKey = `apifootball:teams:search:${searchTerm}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Searching teams: ${searchTerm}`);
    const teams = await executeRequest('/teams', { search: searchTerm });
    return teams;
  }, 86400); // 24 hours TTL
}

module.exports = {
  getTeamById,
  getTeamsByLeague,
  searchTeams,
};
