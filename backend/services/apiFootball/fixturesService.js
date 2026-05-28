'use strict';

/**
 * services/apiFootball/fixturesService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API-Football fixtures service with caching and normalization.
 */

const { executeRequest } = require('../../src/config/providers/apiFootball');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Fetch fixtures for a specific date
 * TTL: 1 hour
 */
async function getFixturesByDate(date) {
  const cacheKey = `apifootball:fixtures:${date}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching fixtures for date: ${date}`);
    const fixtures = await executeRequest('/fixtures', { date });
    return fixtures;
  }, 3600); // 1 hour TTL
}

/**
 * Fetch fixtures for a league and season
 * TTL: 1 hour
 */
async function getFixturesByLeague(leagueId, season) {
  const cacheKey = `apifootball:fixtures:league:${leagueId}:${season}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching fixtures for league: ${leagueId}, season: ${season}`);
    const fixtures = await executeRequest('/fixtures', { league: leagueId, season });
    return fixtures;
  }, 3600); // 1 hour TTL
}

/**
 * Fetch fixture by ID
 * TTL: 15 seconds (for live matches), 1 hour (for finished matches)
 */
async function getFixtureById(fixtureId) {
  const cacheKey = `apifootball:match:${fixtureId}`;
  
  // First, try to get from cache to determine if it's a live match
  const cached = await cache.get(cacheKey);
  const isLive = cached && (cached.status === 'LIVE' || cached.status === 'HT' || cached.status === '1H' || cached.status === '2H');
  const ttl = isLive ? 15 : 3600;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching fixture: ${fixtureId}`);
    const fixtures = await executeRequest('/fixtures', { id: fixtureId });
    return fixtures.length > 0 ? fixtures[0] : null;
  }, ttl);
}

/**
 * Fetch head-to-head between two teams
 * TTL: 24 hours
 */
async function getHeadToHead(team1Id, team2Id) {
  const cacheKey = `apifootball:h2h:${team1Id}:${team2Id}`;
  
  return cache.getOrSet(cacheKey, async () => {
    logger.debug(`[API-Football] Fetching H2H: ${team1Id} vs ${team2Id}`);
    const fixtures = await executeRequest('/fixtures/headtohead', { h2h: `${team1Id}-${team2Id}` });
    return fixtures;
  }, 86400); // 24 hours TTL
}

module.exports = {
  getFixturesByDate,
  getFixturesByLeague,
  getFixtureById,
  getHeadToHead,
};
