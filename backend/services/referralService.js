'use strict';

/**
 * Referral Service
 * ================
 * Business logic for referral system.
 */

const referralRepository = require('../repositories/referralRepository');
const referralDto = require('../dtos/referralDto');
const referralValidator = require('../validators/referralValidator');
const logger = require('../utils/logger');

/**
 * Generate unique referral code
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create referral for user
 */
async function createReferral(userId, ipAddress = null, userAgent = null) {
  try {
    // Check if user already has a referral code
    const existingReferrals = await referralRepository.findByReferrerId(userId);
    if (existingReferrals && existingReferrals.length > 0) {
      return {
        success: true,
        data: referralDto.toReferralDTO(existingReferrals[0]),
        message: 'Referral code already exists',
      };
    }

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await referralRepository.findByCode(referralCode);
      if (!existing) {
        isUnique = true;
      } else {
        referralCode = generateReferralCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return referralDto.errorResponse('GENERATION_FAILED', 'Failed to generate unique referral code');
    }

    // Create referral
    const referralData = {
      referral_code: referralCode,
      referrer_id: userId,
      status: 'pending',
      ip_address: ipAddress,
    };

    const referral = await referralRepository.create(referralData);

    logger.info(`[ReferralService] Referral created for user: ${userId}`);
    return referralDto.successResponse(
      referralDto.toReferralDTO(referral),
      'Referral code created successfully'
    );
  } catch (error) {
    logger.error(`[ReferralService] Error creating referral: ${error.message}`);
    throw error;
  }
}

/**
 * Get user referral info
 */
async function getUserReferral(userId) {
  try {
    const referrals = await referralRepository.findByReferrerId(userId);
    const stats = await referralRepository.getReferralStats(userId);

    let referralCode = null;
    if (referrals && referrals.length > 0) {
      referralCode = referrals[0].referral_code;
    }

    return {
      success: true,
      data: {
        referral_code: referralCode,
        stats: referralDto.toReferralStatsDTO(stats),
      },
    };
  } catch (error) {
    logger.error(`[ReferralService] Error getting user referral: ${error.message}`);
    throw error;
  }
}

/**
 * Redeem referral code
 */
async function redeemReferral(userId, referralCode, ipAddress = null, userAgent = null) {
  try {
    // Validate referral code
    const validation = referralValidator.validateReferralRedeem({ referral_code: referralCode });
    if (!validation.valid) {
      return referralDto.errorResponse('VALIDATION_ERROR', 'Invalid referral code', validation.errors);
    }

    // Find referral by code
    const referral = await referralRepository.findByCode(referralCode);
    if (!referral) {
      return referralDto.errorResponse('REFERRAL_NOT_FOUND', 'Referral code not found');
    }

    // Check if user is trying to refer themselves
    if (referral.referrer_id === userId) {
      return referralDto.errorResponse('SELF_REFERRAL', 'Cannot refer yourself');
    }

    // Check if user already used a referral
    const existingReferral = await referralRepository.findByReferredUserId(userId);
    if (existingReferral) {
      return referralDto.errorResponse('ALREADY_REFERRED', 'You have already used a referral code');
    }

    // Update referral with referred user
    const updatedReferral = await referralRepository.update(referral.id, {
      referred_user_id: userId,
      status: 'completed',
      ip_address: ipAddress,
    });

    // Complete referral and award points
    const completedReferral = await referralRepository.completeReferral(referral.id, 100);

    // Create reward for referrer
    await referralRepository.createReward({
      referral_id: referral.id,
      user_id: referral.referrer_id,
      reward_type: 'points',
      reward_amount: 100,
      reward_description: 'Referral reward',
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    });

    // Create reward for referred user
    await referralRepository.createReward({
      referral_id: referral.id,
      user_id: userId,
      reward_type: 'points',
      reward_amount: 50,
      reward_description: 'Welcome bonus',
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    });

    logger.info(`[ReferralService] Referral redeemed by user: ${userId}, code: ${referralCode}`);
    return referralDto.successResponse(
      referralDto.toReferralDTO(completedReferral),
      'Referral code redeemed successfully'
    );
  } catch (error) {
    logger.error(`[ReferralService] Error redeeming referral: ${error.message}`);
    throw error;
  }
}

/**
 * Get referral history
 */
async function getReferralHistory(userId, status = null) {
  try {
    const referrals = await referralRepository.findByReferrerId(userId, status);

    return {
      success: true,
      data: referralDto.toReferralDTOs(referrals),
    };
  } catch (error) {
    logger.error(`[ReferralService] Error getting referral history: ${error.message}`);
    throw error;
  }
}

/**
 * Get referral rewards
 */
async function getReferralRewards(userId, status = null) {
  try {
    const rewards = await referralRepository.getRewardsByUserId(userId, status);

    return {
      success: true,
      data: referralDto.toReferralRewardDTOs(rewards),
    };
  } catch (error) {
    logger.error(`[ReferralService] Error getting referral rewards: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createReferral,
  getUserReferral,
  redeemReferral,
  getReferralHistory,
  getReferralRewards,
};
