'use strict';

/**
 * Analytics Routes
 * ===============
 * REST API endpoints for analytics event tracking.
 */

const { Router } = require('express');
const { requireAuth, optionalAuth } = require('../../middleware/auth');
const analyticsService = require('../../services/analyticsService');

const router = Router();

/**
 * POST /api/v1/analytics/track
 * Track analytics event
 */
router.post('/track', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.uid : null;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await analyticsService.trackEvent(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/analytics/batch
 * Batch track analytics events
 */
router.post('/batch', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.uid : null;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const { events } = req.body;
    const result = await analyticsService.batchTrackEvents(userId, events, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/events
 * Get user analytics events
 */
router.get('/events', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const eventName = req.query.event_name;
    const days = parseInt(req.query.days) || 30;
    const result = await analyticsService.getUserEvents(userId, eventName, days);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/stats
 * Get analytics stats
 */
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const days = parseInt(req.query.days) || 30;
    const result = await analyticsService.getAnalyticsStats(userId, days);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/counts
 * Get event counts
 */
router.get('/counts', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const days = parseInt(req.query.days) || 30;
    const result = await analyticsService.getEventCounts(userId, days);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
