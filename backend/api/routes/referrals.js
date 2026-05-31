'use strict';

/**
 * Referral Routes
 * ==============
 * REST API endpoints for referral system.
 */

const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth');
const referralService = require('../../services/referralService');

const router = Router();

/**
 * GET /api/v1/users/referral
 * Get user referral info
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await referralService.getUserReferral(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/referral
 * Create referral code for user
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await referralService.createReferral(userId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/referral/redeem
 * Redeem referral code
 */
router.post('/redeem', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { referral_code } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await referralService.redeemReferral(userId, referral_code, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/referral/history
 * Get referral history
 */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const status = req.query.status;
    const result = await referralService.getReferralHistory(userId, status);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/referral/rewards
 * Get referral rewards
 */
router.get('/rewards', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const status = req.query.status;
    const result = await referralService.getReferralRewards(userId, status);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
