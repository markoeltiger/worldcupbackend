'use strict';

/**
 * Football Teams API Routes
 * =========================
 * REST API endpoints for team data.
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const rapidApiProvider = require('../../ingestion/providers/rapidApiFootballProvider');
const normalizer = require('../../normalizers/rapidApiNormalizer');
const cacheManager = require('../../cache/footballCacheManager');
const persistenceService = require('../../services/persistenceService');

/**
 * GET /api/v1/teams
 * Get all teams
 */
router.get('/', async (req, res) => {
  try {
    const { league, page = 1, limit = 50 } = req.query;

    // Try cache first
    const cacheKey = `teams:${league || 'all'}:${page}`;
    const cached = await cacheManager.get('teams', cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawTeams = await rapidApiProvider.getTeams(league);
    const normalizedTeams = rawTeams.map(t => normalizer.normalizeTeam(t)).filter(Boolean);

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginated = normalizedTeams.slice(startIndex, startIndex + parseInt(limit));

    // Cache result
    await cacheManager.set('teams', cacheKey, paginated);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: normalizedTeams.length,
        pages: Math.ceil(normalizedTeams.length / limit),
      },
    });
  } catch (error) {
    logger.error('[Teams API] Error fetching teams:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/teams/:id
 * Get team by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await cacheManager.get('team', id);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // This would need a specific team endpoint
    res.json({
      success: true,
      data: null,
      message: 'Team by ID endpoint not yet implemented',
    });
  } catch (error) {
    logger.error('[Teams API] Error fetching team:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/teams/:id/fixtures
 * Get team fixtures
 */
router.get('/:id/fixtures', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Try cache first
    const cacheKey = `team_fixtures:${id}:${page}`;
    const cached = await cacheManager.get('fixtures', cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawFixtures = await rapidApiProvider.getFixtures(null, id);
    const normalizedFixtures = normalizer.normalizeMatches(rawFixtures);
    const validFixtures = normalizedFixtures.filter(m => normalizer.validateMatch(m));

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginated = validFixtures.slice(startIndex, startIndex + parseInt(limit));

    // Cache result
    await cacheManager.set('fixtures', cacheKey, paginated);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: validFixtures.length,
        pages: Math.ceil(validFixtures.length / limit),
      },
    });
  } catch (error) {
    logger.error('[Teams API] Error fetching team fixtures:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/teams/:id/players
 * Get team players
 */
router.get('/:id/players', async (req, res) => {
  try {
    const { id } = req.params;

    // This would need a players endpoint
    res.json({
      success: true,
      data: [],
      message: 'Team players endpoint not yet implemented',
    });
  } catch (error) {
    logger.error('[Teams API] Error fetching team players:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/teams/:id/stats
 * Get team statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { season } = req.query;

    // This would need a team stats endpoint
    res.json({
      success: true,
      data: null,
      message: 'Team stats endpoint not yet implemented',
    });
  } catch (error) {
    logger.error('[Teams API] Error fetching team stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
