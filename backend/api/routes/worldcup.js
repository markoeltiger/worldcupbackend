'use strict';

/**
 * World Cup API Routes
 * ===================
 * REST API endpoints for World Cup data.
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const worldCupService = require('../../services/worldCupPriorityService');
const cacheManager = require('../../cache/footballCacheManager');

/**
 * GET /api/v1/worldcup/live
 * Get World Cup live matches
 */
router.get('/live', async (req, res) => {
  try {
    const matches = await worldCupService.getLiveMatches();

    res.json({
      success: true,
      data: matches,
      count: matches.length,
    });
  } catch (error) {
    logger.error('[WorldCup API] Error fetching live matches:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/worldcup/fixtures
 * Get World Cup fixtures
 */
router.get('/fixtures', async (req, res) => {
  try {
    const fixtures = await worldCupService.getFixtures();

    res.json({
      success: true,
      data: fixtures,
      count: fixtures.length,
    });
  } catch (error) {
    logger.error('[WorldCup API] Error fetching fixtures:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/worldcup/standings
 * Get World Cup standings
 */
router.get('/standings', async (req, res) => {
  try {
    const standings = await worldCupService.getStandings();

    res.json({
      success: true,
      data: standings,
    });
  } catch (error) {
    logger.error('[WorldCup API] Error fetching standings:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/worldcup/groups
 * Get World Cup groups
 */
router.get('/groups', async (req, res) => {
  try {
    const groups = await worldCupService.getGroups();

    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    logger.error('[WorldCup API] Error fetching groups:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/worldcup/teams
 * Get World Cup teams
 */
router.get('/teams', async (req, res) => {
  try {
    const teams = await worldCupService.getTeams();

    res.json({
      success: true,
      data: teams,
      count: teams.length,
    });
  } catch (error) {
    logger.error('[WorldCup API] Error fetching teams:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/worldcup/bracket
 * Get World Cup bracket
 */
router.get('/bracket', async (req, res) => {
  try {
    const bracket = await worldCupService.getBracket();

    res.json({
      success: true,
      data: bracket,
    });
  } catch (error) {
    logger.error('[WorldCup API] Error fetching bracket:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
