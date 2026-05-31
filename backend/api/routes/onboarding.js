'use strict';

/**
 * Onboarding Routes
 * ================
 * REST API endpoints for onboarding system.
 */

const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth');
const onboardingService = require('../../services/onboardingService');

const router = Router();

/**
 * GET /api/v1/onboarding
 * Get user onboarding status and data
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await onboardingService.getUserOnboarding(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/onboarding/complete
 * Complete user onboarding
 */
router.post('/complete', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await onboardingService.completeOnboarding(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/onboarding
 * Update user onboarding data
 */
router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await onboardingService.updateOnboarding(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/onboarding/stats
 * Get onboarding completion statistics (admin only)
 */
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    // TODO: Add admin check
    const result = await onboardingService.getOnboardingStats();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/onboarding
 * Reset onboarding (for testing purposes)
 */
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await onboardingService.resetOnboarding(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
