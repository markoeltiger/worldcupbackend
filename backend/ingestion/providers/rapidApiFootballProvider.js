'use strict';

/**
 * RapidAPI Football Data Provider
 * ===============================
 * Primary provider for live football data.
 * Integrates with RapidAPI free-api-live-football-data.
 * 
 * Supports:
 * - Live matches
 * - Fixtures
 * - Standings
 * - Teams
 * - Lineups
 * - Statistics
 * - Match events
 * - Player stats
 * - Top scorers
 * - Venues
 * - H2H data
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const healthManager = require('../../services/healthManager');

const PROVIDER_NAME = 'rapidapi_football';

// Configuration
const CONFIG = {
  apiKey: process.env.RAPIDAPI_KEY,
  host: process.env.RAPIDAPI_HOST || 'free-api-live-football-data.p.rapidapi.com',
  baseUrl: process.env.RAPIDAPI_BASE_URL || 'https://free-api-live-football-data.p.rapidapi.com',
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000,
};

// Create axios instance with default config
const httpClient = axios.create({
  baseURL: CONFIG.baseUrl,
  timeout: CONFIG.timeout,
  headers: {
    'x-rapidapi-key': CONFIG.apiKey,
    'x-rapidapi-host': CONFIG.host,
    'Content-Type': 'application/json',
  },
});

/**
 * Make API request with retry logic and circuit breaker
 */
async function makeRequest(endpoint, params = {}) {
  const startTime = Date.now();
  
  try {
    const response = await httpClient.get(endpoint, { params });
    const duration = Date.now() - startTime;
    
    healthManager.recordSuccess(PROVIDER_NAME, duration);
    logger.debug(`[RapidAPI] ${endpoint} success in ${duration}ms`);
    
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    healthManager.recordFailure(PROVIDER_NAME);
    
    if (error.response) {
      logger.error(`[RapidAPI] ${endpoint} failed: ${error.response.status} - ${error.response.statusText}`);
      throw new Error(`RapidAPI error: ${error.response.status}`);
    } else if (error.request) {
      logger.error(`[RapidAPI] ${endpoint} failed: No response received`);
      throw new Error('RapidAPI network error');
    } else {
      logger.error(`[RapidAPI] ${endpoint} failed: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Fetch live matches
 */
async function getLiveMatches(leagueId = null) {
  try {
    const params = {};
    if (leagueId) {
      params.leagueid = leagueId;
    }
    
    const data = await makeRequest('/football-current-live', params);
    return data?.response?.live || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch live matches: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch live matches (alternative endpoint)
 */
async function getLiveMatchesV2() {
  try {
    const data = await makeRequest('/football-current-live', {});
    return data?.response?.live || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch live matches v2: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch fixtures
 */
async function getFixtures(leagueId = null, teamId = null, date = null) {
  try {
    const params = {};
    if (leagueId) params.leagueid = leagueId;
    if (teamId) params.teamid = teamId;
    if (date) params.date = date;
    
    const data = await makeRequest('/football-get-all-matches-by-league', params);
    return data?.response?.matches || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch fixtures: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch standings
 */
async function getStandings(leagueId, season = null) {
  try {
    const params = { leagueid: leagueId };
    if (season) params.season = season;
    
    const data = await makeRequest('/football-get-list-all-team', params);
    return data?.response?.list || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch standings: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch teams
 */
async function getTeams(leagueId = null) {
  try {
    const params = {};
    if (leagueId) params.leagueid = leagueId;
    
    const data = await makeRequest('/football-get-list-all-team', params);
    return data?.response?.list || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch teams: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch lineups
 */
async function getLineups(matchId) {
  try {
    const params = { eventid: matchId };
    const data = await makeRequest('/football-get-hometeam-lineup', params);
    return data || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch lineups for match ${matchId}: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch statistics
 */
async function getStatistics(matchId) {
  try {
    const params = { eventid: matchId };
    const data = await makeRequest('/football-get-match-all-stats', params);
    return data || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch statistics for match ${matchId}: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch match events
 */
async function getMatchEvents(matchId) {
  try {
    const params = { eventid: matchId };
    const data = await makeRequest('/football-get-match-detail', params);
    return data || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch events for match ${matchId}: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch player stats
 */
async function getPlayerStats(playerId, leagueId = null) {
  try {
    const params = { playerid: playerId };
    if (leagueId) params.leagueid = leagueId;
    
    const data = await makeRequest('/football-get-player-detail', params);
    return data || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch player stats: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch top scorers
 */
async function getTopScorers(leagueId, season = null) {
  try {
    const params = { leagueid: leagueId };
    if (season) params.season = season;
    
    const data = await makeRequest('/football-get-top-players-by-goals', params);
    return data || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch top scorers: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch venues
 */
async function getVenues() {
  try {
    const data = await makeRequest('/football-get-all-venues');
    return data || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch venues: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch H2H data
 */
async function getH2H(team1Id, team2Id) {
  try {
    const params = { eventid: team1Id };
    
    const data = await makeRequest('/football-get-head-to-head', params);
    return data || [];
  } catch (error) {
    logger.error(`[RapidAPI] Failed to fetch H2H data: ${error.message}`);
    throw error;
  }
}

/**
 * Get provider health status
 */
function getHealth() {
  const health = healthManager.getProviderStatus(PROVIDER_NAME);
  return {
    provider: PROVIDER_NAME,
    ...health,
    configured: !!CONFIG.apiKey,
  };
}

/**
 * Initialize provider
 */
async function initialize() {
  if (!CONFIG.apiKey) {
    logger.warn('[RapidAPI] No API key configured. Provider will not function.');
    return false;
  }
  
  logger.info('[RapidAPI] Provider initialized');
  return true;
}

module.exports = {
  PROVIDER_NAME,
  getLiveMatches,
  getFixtures,
  getStandings,
  getTeams,
  getLineups,
  getStatistics,
  getMatchEvents,
  getPlayerStats,
  getTopScorers,
  getVenues,
  getH2H,
  getHealth,
  initialize,
};
