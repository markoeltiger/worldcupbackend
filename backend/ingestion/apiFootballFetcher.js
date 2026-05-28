'use strict';

/**
 * apiFootballFetcher.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LEGACY COMPATIBILITY SHIM - DEPRECATED
 * 
 * This file exists for backward compatibility only.
 * All new code should use services/apiFootball instead.
 * 
 * This shim delegates to the new centralized API-Football service layer.
 */

const apiFootballService = require('../services/apiFootball');
const logger = require('../utils/logger');

// Shim functions that delegate to the new service layer
async function fetchLiveMatches() {
  logger.warn('[apiFootballFetcher] DEPRECATED - Use services/apiFootball instead');
  return apiFootballService.live.getLiveMatches();
}

async function fetchFixtures(leagueId, season) {
  logger.warn('[apiFootballFetcher] DEPRECATED - Use services/apiFootball instead');
  return apiFootballService.fixtures.getFixturesByLeague(leagueId, season);
}

async function fetchMatchEvents(fixtureId) {
  logger.warn('[apiFootballFetcher] DEPRECATED - Use services/apiFootball instead');
  return apiFootballService.events.getEvents(fixtureId);
}

async function fetchStandings(leagueId, season) {
  logger.warn('[apiFootballFetcher] DEPRECATED - Use services/apiFootball instead');
  return apiFootballService.standings.getStandings(leagueId, season);
}

async function fetchFixtureWithEvents(fixtureId) {
  logger.warn('[apiFootballFetcher] DEPRECATED - Use services/apiFootball instead');
  const fixture = await apiFootballService.fixtures.getFixtureById(fixtureId);
  const events = await apiFootballService.events.getEvents(fixtureId);
  if (!fixture) return null;
  return { ...fixture, events };
}

module.exports = {
  fetchLiveMatches,
  fetchFixtures,
  fetchMatchEvents,
  fetchStandings,
  fetchFixtureWithEvents,
};
