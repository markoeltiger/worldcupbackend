'use strict';

/**
 * apiFootballFetcher.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Secondary data provider: API-Football (v3.football.api-sports.io)
 *
 * PRODUCTION RULES:
 * - If API key missing → THROW ProviderUnconfiguredError
 * - Detect API-Football's 200 OK error responses (quota, invalid key, etc.)
 * - In-memory daily call counter to avoid exceeding free-tier limits
 * - Exponential backoff retries
 */

const axios          = require('axios');
const { withRetry }  = require('../utils/retry');
const { getOrSet }   = require('../utils/cache');
const logger         = require('../utils/logger');

const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY || '';

// In-memory daily quota tracker (resets at midnight)
let dailyCallCount = 0;
let lastResetDate  = new Date().toDateString();

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyCallCount = 0;
    lastResetDate  = today;
    logger.info('[API-Football] Daily call counter reset.');
  }
}

function checkDailyLimit() {
  resetDailyCounterIfNeeded();
  if (dailyCallCount >= 90) { // 10-call safety buffer below free-tier 100/day
    const err = new Error('[API-Football] Daily quota limit reached (90 calls). Activating failover.');
    err.code = 'PROVIDER_QUOTA_EXCEEDED';
    throw err;
  }
}

/**
 * Internal GET helper — handles auth headers, quota tracking, and API-Football
 * 200-OK error body detection (quota exceeded, invalid key, etc.)
 */
async function apiGet(endpoint, params = {}) {
  // ─── Key Guard ───────────────────────────────────────────────────────────
  if (!API_KEY) {
    const err = new Error('[API-Football] API key not configured — skipping this provider');
    err.code = 'PROVIDER_UNCONFIGURED';
    throw err;
  }

  checkDailyLimit();

  const response = await withRetry(
    () => axios.get(`${BASE_URL}${endpoint}`, {
      headers: {
        'x-apisports-key': API_KEY,
        'Content-Type':    'application/json',
      },
      params,
      timeout: 10_000,
    }),
    { retries: 3, baseDelayMs: 1500, label: `api-football:${endpoint}` }
  );

  dailyCallCount++;
  logger.debug(`[API-Football] ${endpoint} | calls today: ${dailyCallCount}`);

  // ─── 200 OK Error Detection ───────────────────────────────────────────────
  // API-Football embeds errors inside 200 OK responses.
  // Examples: quota exceeded, invalid API key, wrong endpoint.
  const errors = response.data?.errors;
  if (errors) {
    const hasErrors = Array.isArray(errors)
      ? errors.length > 0
      : Object.keys(errors).length > 0;

    if (hasErrors) {
      const detail = JSON.stringify(errors);

      // Classify the error type for better failover decisions
      let code = 'PROVIDER_API_ERROR';
      if (detail.toLowerCase().includes('quota') || detail.toLowerCase().includes('limit')) {
        code = 'PROVIDER_QUOTA_EXCEEDED';
      } else if (detail.toLowerCase().includes('token') || detail.toLowerCase().includes('key')) {
        code = 'PROVIDER_INVALID_KEY';
      }

      const err = new Error(`[API-Football] API error: ${detail}`);
      err.code = code;
      throw err;
    }
  }

  return response.data?.response || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all currently live matches across all leagues.
 * @throws {Error} on missing key, quota exceeded, or API error
 */
async function fetchLiveMatches() {
  return getOrSet('api:live', () => apiGet('/fixtures', { live: 'all' }), 25);
}

/**
 * Fetch today's fixtures for a league.
 */
async function fetchFixtures(leagueId, season) {
  const today    = new Date().toISOString().split('T')[0];
  const cacheKey = `api:fixtures:${leagueId}:${today}`;
  return getOrSet(cacheKey, () => apiGet('/fixtures', { league: leagueId, season, date: today }), 300);
}

/**
 * Fetch events for a single fixture.
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
 * Fetch full fixture details + events in one compound call.
 */
async function fetchFixtureWithEvents(fixtureId) {
  const cacheKey = `api:fixture:${fixtureId}`;
  return getOrSet(cacheKey, async () => {
    const fixtures = await apiGet('/fixtures', { id: fixtureId });
    const events   = await apiGet('/fixtures/events', { fixture: fixtureId });
    if (fixtures.length === 0) return null;
    return { ...fixtures[0], events };
  }, 20);
}

module.exports = {
  fetchLiveMatches,
  fetchFixtures,
  fetchMatchEvents,
  fetchStandings,
  fetchFixtureWithEvents,
};
