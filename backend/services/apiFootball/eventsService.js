'use strict';

/**
 * services/apiFootball/eventsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Football events service with caching and normalization.
 */

const { executeRequest } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Fetch events for a fixture
 * TTL: 15 seconds during live matches, 1 hour for finished matches
 */
async function getEvents(fixtureId) {
  const cacheKey = `apifootball:events:${fixtureId}`;
  
  // First check if match is live to determine TTL
  const fixture = await executeRequest('/fixtures', { id: fixtureId });
  if (fixture.length === 0) return [];
  
  const match = fixture[0];
  const status = match.fixture?.status?.short;
  const isLive = status === 'LIVE' || status === 'HT' || status === '1H' || status === '2H';
  const ttl = isLive ? 15 : 3600; // 15s if live, 1h if finished
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching events for fixture: ${fixtureId}`);
    const events = await executeRequest('/fixtures/events', { fixture: fixtureId });
    return events;
  }, ttl);
}

module.exports = {
  getEvents,
};
