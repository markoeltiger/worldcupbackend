'use strict';

/**
 * footballDataFetcher.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tertiary data provider: football-data.org (v4 API)
 *
 * PRODUCTION RULES:
 * - API token MUST come from environment — no hardcoded fallback keys
 * - If token missing → THROW ProviderUnconfiguredError
 * - If API call fails → THROW (activates failover chain)
 */

const axios          = require('axios');
const cache          = require('../utils/cache');
const { withRetry }  = require('../utils/retry');
const logger         = require('../utils/logger');

const API_BASE_URL = process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4';
const API_TOKEN    = process.env.FOOTBALL_DATA_API_TOKEN || '';

function getClient() {
  if (!API_TOKEN) {
    const err = new Error('[FootballData] API token not configured — skipping this provider');
    err.code = 'PROVIDER_UNCONFIGURED';
    throw err;
  }
  return axios.create({
    baseURL: API_BASE_URL,
    headers: { 'X-Auth-Token': API_TOKEN },
    timeout: 8000,
  });
}

/**
 * Fetch live/scheduled matches from football-data.org.
 *
 * @param {object} params  Query params (e.g. { status: 'LIVE' })
 * @throws {Error} on missing token or API failure
 */
async function fetchMatches(params = {}) {
  const cacheKey = `football_data:matches:${JSON.stringify(params)}`;

  return cache.getOrSet(cacheKey, async () => {
    logger.info(`[FootballData] Fetching matches | params: ${JSON.stringify(params)}`);
    const client = getClient();
    const res = await withRetry(
      () => client.get('/matches', { params }),
      { retries: 2, baseDelayMs: 1500, label: 'football-data:matches' }
    );
    const matches = res.data?.matches || [];
    logger.info(`[FootballData] Fetched ${matches.length} matches`);
    return matches;
  }, 30);
}

/**
 * Fetch a single match detail.
 * Cached 10s for live matches, 1h for finished matches.
 */
async function fetchMatchDetail(matchId) {
  const cacheKey = `football_data:match:${matchId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  logger.info(`[FootballData] Fetching match detail: ${matchId}`);
  const client = getClient();
  const res = await withRetry(
    () => client.get(`/matches/${matchId}`),
    { retries: 2, baseDelayMs: 1500, label: `football-data:match:${matchId}` }
  );
  const match = res.data;

  const ttl = match?.status === 'FINISHED' ? 3600 : 10;
  await cache.set(cacheKey, match, ttl);
  return match;
}

/**
 * Fetch competition standings. Cached 1h.
 */
async function fetchStandings(competitionCode) {
  const cacheKey = `football_data:standings:${competitionCode}`;
  return cache.getOrSet(cacheKey, async () => {
    logger.info(`[FootballData] Fetching standings: ${competitionCode}`);
    const client = getClient();
    const res = await withRetry(
      () => client.get(`/competitions/${competitionCode}/standings`),
      { retries: 2, baseDelayMs: 1500, label: `football-data:standings:${competitionCode}` }
    );
    return res.data?.standings || [];
  }, 3600);
}

/**
 * Fetch team details. Cached 24h.
 */
async function fetchTeamDetail(teamId) {
  const cacheKey = `football_data:team:${teamId}`;
  return cache.getOrSet(cacheKey, async () => {
    logger.info(`[FootballData] Fetching team: ${teamId}`);
    const client = getClient();
    const res = await withRetry(
      () => client.get(`/teams/${teamId}`),
      { retries: 2, baseDelayMs: 1500, label: `football-data:team:${teamId}` }
    );
    return res.data || null;
  }, 86400);
}

module.exports = {
  fetchMatches,
  fetchMatchDetail,
  fetchStandings,
  fetchTeamDetail,
};
