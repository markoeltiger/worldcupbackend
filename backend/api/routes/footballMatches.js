'use strict';

/**
 * Football Matches API Routes
 * ===========================
 * REST API endpoints for match data.
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const rapidApiProvider = require('../../ingestion/providers/rapidApiFootballProvider');
const normalizer = require('../../normalizers/rapidApiNormalizer');
const cacheManager = require('../../cache/footballCacheManager');
const persistenceService = require('../../services/persistenceService');
const realtimeEngine = require('../../services/realtimeEngine');

/**
 * GET /api/v1/matches
 * Get all matches with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { league, team, date, status, page = 1, limit = 50 } = req.query;

    // Try cache first
    const cacheKey = `matches:${league || 'all'}:${team || 'all'}:${date || 'all'}:${status || 'all'}`;
    const cached = await cacheManager.get('matches', cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawMatches = await rapidApiProvider.getFixtures(league, team, date);
    const normalizedMatches = normalizer.normalizeMatches(rawMatches);
    const validMatches = normalizedMatches.filter(m => normalizer.validateMatch(m));

    // Filter by status if provided
    let filtered = validMatches;
    if (status) {
      filtered = validMatches.filter(m => m.status === status);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + parseInt(limit));

    // Cache result
    await cacheManager.set('matches', cacheKey, paginated);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
      },
    });
  } catch (error) {
    logger.error('[Matches API] Error fetching matches:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/matches/live
 * Get live matches
 */
router.get('/live', async (req, res) => {
  try {
    // Try cache first
    const cached = await cacheManager.get('live_matches', 'all');
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawMatches = await rapidApiProvider.getLiveMatches();
    const normalizedMatches = normalizer.normalizeMatches(rawMatches);
    const validMatches = normalizedMatches.filter(m => normalizer.validateMatch(m));

    // Cache result
    await cacheManager.set('live_matches', 'all', validMatches);

    res.json({
      success: true,
      data: validMatches,
      count: validMatches.length,
    });
  } catch (error) {
    logger.error('[Matches API] Error fetching live matches:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/matches/:id
 * Get match by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await cacheManager.get('match_details', id);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider (would need specific endpoint)
    // For now, try to get from database
    const dbMatch = await persistenceService.getMatchByExternalId(id);
    
    if (dbMatch) {
      await cacheManager.set('match_details', id, dbMatch);
      return res.json({
        success: true,
        data: dbMatch,
      });
    }

    res.status(404).json({
      success: false,
      error: 'Match not found',
    });
  } catch (error) {
    logger.error('[Matches API] Error fetching match:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/matches/:id/events
 * Get match events
 */
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await cacheManager.get('match_events', id);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawEvents = await rapidApiProvider.getMatchEvents(id);
    const normalizedEvents = normalizer.normalizeEvents(rawEvents);

    // Cache result
    await cacheManager.set('match_events', id, normalizedEvents);

    res.json({
      success: true,
      data: normalizedEvents,
    });
  } catch (error) {
    logger.error('[Matches API] Error fetching match events:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/matches/:id/stats
 * Get match statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await cacheManager.get('match_statistics', id);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawStats = await rapidApiProvider.getStatistics(id);
    const normalizedStats = normalizer.normalizeStatistics(rawStats);

    // Cache result
    await cacheManager.set('match_statistics', id, normalizedStats);

    res.json({
      success: true,
      data: normalizedStats,
    });
  } catch (error) {
    logger.error('[Matches API] Error fetching match statistics:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/matches/:id/lineups
 * Get match lineups
 */
router.get('/:id/lineups', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await cacheManager.get('match_lineups', id);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from provider
    const rawLineups = await rapidApiProvider.getLineups(id);
    const normalizedLineups = normalizer.normalizeLineups(rawLineups);

    // Cache result
    await cacheManager.set('match_lineups', id, normalizedLineups);

    res.json({
      success: true,
      data: normalizedLineups,
    });
  } catch (error) {
    logger.error('[Matches API] Error fetching match lineups:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/matches/:id/h2h
 * Get head-to-head data
 */
router.get('/:id/h2h', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await cacheManager.get('match_h2h', id);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Would need team IDs from match
    // For now, return empty
    res.json({
      success: true,
      data: null,
      message: 'H2H data requires team IDs',
    });
  } catch (error) {
    logger.error('[Matches API] Error fetching H2H data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/live/stream
 * SSE endpoint for live match updates
 */
router.get('/live/stream', async (req, res) => {
  const { match_id } = req.query;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Add subscriber
  if (match_id) {
    realtimeEngine.addSubscriber(match_id, res);

    // Remove on disconnect
    req.on('close', () => {
      realtimeEngine.removeSubscriber(match_id, res);
    });
  } else {
    // Send all live matches updates
    res.write('data: {"message": "Connected to live stream"}\n\n');
  }
});

module.exports = router;
