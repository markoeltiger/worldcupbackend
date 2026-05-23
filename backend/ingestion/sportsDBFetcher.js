'use strict';

const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { getOrSet } = require('../utils/cache');
const logger = require('../utils/logger');

const BASE_URL = process.env.SPORTSDB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/3';

async function sdbGet(path) {
  const response = await withRetry(
    () => axios.get(`${BASE_URL}${path}`, { timeout: 10_000 }),
    { retries: 3, baseDelayMs: 1000, label: `sportsDB:${path}` }
  );
  return response.data;
}

/**
 * Fetch live events from TheSportsDB (free tier, no API key).
 */
async function fetchLiveMatches() {
  return getOrSet('sdb:live', async () => {
    const data = await sdbGet('/livescore.php');
    return data?.events || [];
  }, 30);
}

/**
 * Fetch fixtures for a league by league ID.
 */
async function fetchFixturesByLeague(leagueId) {
  return getOrSet(`sdb:fixtures:${leagueId}`, async () => {
    const data = await sdbGet(`/eventsseason.php?id=${leagueId}`);
    return data?.events || [];
  }, 600);
}

/**
 * Fetch a single event by ID.
 */
async function fetchEventById(eventId) {
  const data = await sdbGet(`/lookupevent.php?id=${eventId}`);
  return data?.events?.[0] || null;
}

module.exports = { fetchLiveMatches, fetchFixturesByLeague, fetchEventById };
