'use strict';

/**
 * Football Leagues API Routes
 * ===========================
 * REST API endpoints for league data.
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const rapidApiProvider = require('../../ingestion/providers/rapidApiFootballProvider');
const normalizer = require('../../normalizers/rapidApiNormalizer');
const cacheManager = require('../../cache/footballCacheManager');
const persistenceService = require('../../services/persistenceService');

/**
 * GET /api/v1/leagues
 * Get all leagues
 */
router.get('/', async (req, res) => {
  try {
    // Try cache first
    const cached = await cacheManager.get('leagues', 'all');
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // This would need a leagues endpoint from RapidAPI
    // For now, return empty array
    res.json({
      success: true,
      data: [],
      message: 'Leagues endpoint not yet implemented',
    });
  } catch (error) {
    logger.error('[Leagues API] Error fetching leagues:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/leagues/:id
 * Get league by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await cacheManager.get('league', id);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    res.json({
      success: true,
      data: null,
      message: 'League endpoint not yet implemented',
    });
  } catch (error) {
    logger.error('[Leagues API] Error fetching league:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/leagues/:id/standings
 * Get league standings
 */
router.get('/:id/standings', async (req, res) => {
  try {
    const { id } = req.params;
    const { season } = req.query;

    // Try cache first
    const cacheKey = `standings:${id}:${season || 'current'}`;
    const cached = await cacheManager.get('standings', cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawStandings = await rapidApiProvider.getStandings(id, season);
    const normalizedStandings = normalizer.normalizeStandings(rawStandings);

    // Cache result
    await cacheManager.set('standings', cacheKey, normalizedStandings);

    res.json({
      success: true,
      data: normalizedStandings,
    });
  } catch (error) {
    logger.error('[Leagues API] Error fetching standings:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/leagues/:id/fixtures
 * Get league fixtures
 */
router.get('/:id/fixtures', async (req, res) => {
  try {
    const { id } = req.params;
    const { season, page = 1, limit = 50 } = req.query;

    // Try cache first
    const cacheKey = `league_fixtures:${id}:${season || 'current'}:${page}`;
    const cached = await cacheManager.get('fixtures', cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawFixtures = await rapidApiProvider.getFixtures(id);
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
    logger.error('[Leagues API] Error fetching fixtures:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/leagues/:id/topscorers
 * Get league top scorers
 */
router.get('/:id/topscorers', async (req, res) => {
  try {
    const { id } = req.params;
    const { season } = req.query;

    // Try cache first
    const cacheKey = `topscorers:${id}:${season || 'current'}`;
    const cached = await cacheManager.get('topscorers', cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawScorers = await rapidApiProvider.getTopScorers(id, season);
    const normalizedScorers = rawScorers.map(s => normalizer.normalizePlayerStats(s)).filter(Boolean);

    // Cache result
    await cacheManager.set('topscorers', cacheKey, normalizedScorers);

    res.json({
      success: true,
      data: normalizedScorers,
    });
  } catch (error) {
    logger.error('[Leagues API] Error fetching top scorers:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
