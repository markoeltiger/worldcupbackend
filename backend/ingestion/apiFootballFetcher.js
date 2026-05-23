'use strict';

const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { getOrSet } = require('../utils/cache');
const logger = require('../utils/logger');

const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;

// Tracked in-memory — stays below free-tier 100/day limit
let dailyCallCount = 0;
let lastResetDate  = new Date().toDateString();

function getRateLimitedHeaders() {
  return {
    'x-apisports-key': API_KEY,
    'Content-Type': 'application/json',
  };
}

function checkDailyLimit() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) { dailyCallCount = 0; lastResetDate = today; }
  if (dailyCallCount >= 90) {  // keep 10-call safety buffer
    throw new Error('API-Football daily limit reached (90 calls). Falling back to scraper.');
  }
}

async function apiGet(endpoint, params = {}) {
  checkDailyLimit();
  const response = await withRetry(
    () => axios.get(`${BASE_URL}${endpoint}`, {
      headers: getRateLimitedHeaders(),
      params,
      timeout: 10_000,
    }),
    { retries: 3, baseDelayMs: 1500, label: `apiFootball:${endpoint}` }
  );
  dailyCallCount++;
  logger.debug(`[API-Football] ${endpoint} | calls today: ${dailyCallCount}`);

  // API-Football returns errors inside 200 OK responses (e.g. quota limits, invalid tokens)
  if (response.data?.errors && (
    (Array.isArray(response.data.errors) && response.data.errors.length > 0) ||
    (!Array.isArray(response.data.errors) && Object.keys(response.data.errors).length > 0)
  )) {
    const errorMsg = JSON.stringify(response.data.errors);
    throw new Error(`API-Football error response: ${errorMsg}`);
  }

  return response.data?.response || [];
}

// ---- Public API -----------------------------------------------

/**
 * Fetch all currently live matches across all leagues.
 */
async function fetchLiveMatches() {
  return getOrSet('api:live', () => apiGet('/fixtures', { live: 'all' }), 25);
}

/**
 * Fetch today's fixtures for a league.
 * @param {string} leagueId   API-Football league ID
 * @param {string} season     4-digit year string
 */
async function fetchFixtures(leagueId, season) {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `api:fixtures:${leagueId}:${today}`;
  return getOrSet(cacheKey, () => apiGet('/fixtures', { league: leagueId, season, date: today }), 300);
}

/**
 * Fetch detailed events for a single fixture.
 * @param {string|number} fixtureId
 */
async function fetchMatchEvents(fixtureId) {
  return getOrSet(
    `api:events:${fixtureId}`,
    () => apiGet('/fixtures/events', { fixture: fixtureId }),
    20
  );
}

/**
 * Fetch league standings.
 */
async function fetchStandings(leagueId, season) {
  const cacheKey = `api:standings:${leagueId}:${season}`;
  return getOrSet(cacheKey, () => apiGet('/standings', { league: leagueId, season }), 3600);
}

/**
 * Fetch full fixture details including events (single call).
 * More efficient than calling /fixtures + /fixtures/events separately.
 */
async function fetchFixtureWithEvents(fixtureId) {
  const cacheKey = `api:fixture:${fixtureId}`;
  return getOrSet(
    cacheKey,
    async () => {
      const fixtures = await apiGet('/fixtures', { id: fixtureId });
      const events   = await apiGet('/fixtures/events', { fixture: fixtureId });
      if (fixtures.length === 0) return null;
      return { ...fixtures[0], events };
    },
    20
  );
}

module.exports = { fetchLiveMatches, fetchFixtures, fetchMatchEvents, fetchStandings, fetchFixtureWithEvents };
