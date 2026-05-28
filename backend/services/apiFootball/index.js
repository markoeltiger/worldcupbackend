'use strict';

/**
 * services/apiFootball/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Main entry point for API-Football service layer.
 */

const fixturesService = require('./fixturesService');
const liveService = require('./liveService');
const standingsService = require('./standingsService');
const teamsService = require('./teamsService');
const lineupsService = require('./lineupsService');
const statisticsService = require('./statisticsService');
const eventsService = require('./eventsService');
const leaguesService = require('./leaguesService');

module.exports = {
  fixtures: fixturesService,
  live: liveService,
  standings: standingsService,
  teams: teamsService,
  lineups: lineupsService,
  statistics: statisticsService,
  events: eventsService,
  leagues: leaguesService,
};
