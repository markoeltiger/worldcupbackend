'use strict';

const axios = require('axios');
const cache = require('../utils/cache');
const retry = require('../utils/retry');
const logger = require('../utils/logger');

const API_BASE_URL = 'https://api.football-data.org/v4';
const API_TOKEN = process.env.FOOTBALL_DATA_API_TOKEN || '16d701177c73495b8c2015dc55e25b6f';

// Setup axios client with default headers
const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-Auth-Token': API_TOKEN
  },
  timeout: 5000
});

/**
 * Fetch matches/fixtures from football-data.org with caching layer to minimize API calls and cost.
 * Caches match list for 30 seconds (standard live update window).
 */
async function fetchMatches(params = {}) {
  const cacheKey = `football_data:matches:${JSON.stringify(params)}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.info(`[FootballData API] Cache miss. Fetching matches from API endpoint: ${JSON.stringify(params)}`);
    const res = await retry.withRetry(() => client.get('/matches', { params }), { label: 'football-data matches' });
    return res.data?.matches || [];
  }, 30); // 30s cache TTL
}

/**
 * Fetch a specific match detail.
 * Caches live match data for 10 seconds, and finished match data for 1 hour.
 */
async function fetchMatchDetail(matchId) {
  const cacheKey = `football_data:match:${matchId}`;
  
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  logger.info(`[FootballData API] Cache miss. Fetching details for match ID: ${matchId}`);
  const res = await retry.withRetry(() => client.get(`/matches/${matchId}`), { label: `match detail ${matchId}` });
  const match = res.data;

  // Determine TTL: 1 hour if finished (FT), otherwise 10 seconds for live updates
  const isFinished = match?.status === 'FINISHED';
  const ttl = isFinished ? 3600 : 10;
  
  await cache.set(cacheKey, match, ttl);
  return match;
}

/**
 * Fetch competition standings.
 * Caches standings for 1 hour (reduces costs for slow-moving data).
 */
async function fetchStandings(competitionCode) {
  const cacheKey = `football_data:standings:${competitionCode}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.info(`[FootballData API] Cache miss. Fetching standings for: ${competitionCode}`);
    const res = await retry.withRetry(() => client.get(`/competitions/${competitionCode}/standings`), { label: `competition standings ${competitionCode}` });
    return res.data?.standings || [];
  }, 3600); // 1 hour cache TTL
}

/**
 * Fetch team info.
 * Caches details for 24 hours.
 */
async function fetchTeamDetail(teamId) {
  const cacheKey = `football_data:team:${teamId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.info(`[FootballData API] Cache miss. Fetching team details for: ${teamId}`);
    const res = await retry.withRetry(() => client.get(`/teams/${teamId}`), { label: `team detail ${teamId}` });
    return res.data || null;
  }, 86400); // 24 hours cache TTL
}

module.exports = {
  fetchMatches,
  fetchMatchDetail,
  fetchStandings,
  fetchTeamDetail
};

