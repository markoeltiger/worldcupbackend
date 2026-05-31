'use strict';

/**
 * Referral Repository
 * ===================
 * Database operations for referral system using Supabase.
 */

const db = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Find referral by code
 */
async function findByCode(referralCode) {
  try {
    const { data, error } = await db.query(d =>
      d.from('referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error(`[ReferralRepository] Error finding referral by code: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error finding referral by code: ${error.message}`);
    throw error;
  }
}

/**
 * Find referrals by referrer ID
 */
async function findByReferrerId(referrerId, status = null) {
  try {
    let query = db.query(d =>
      d.from('referrals')
        .select('*')
        .eq('referrer_id', referrerId)
    );

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error(`[ReferralRepository] Error finding referrals by referrer: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error finding referrals by referrer: ${error.message}`);
    throw error;
  }
}

/**
 * Find referral by referred user ID
 */
async function findByReferredUserId(referredUserId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('referrals')
        .select('*')
        .eq('referred_user_id', referredUserId)
        .single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error(`[ReferralRepository] Error finding referral by referred user: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error finding referral by referred user: ${error.message}`);
    throw error;
  }
}

/**
 * Create referral
 */
async function create(referralData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('referrals')
        .insert(referralData)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[ReferralRepository] Error creating referral: ${error.message}`);
      throw error;
    }

    logger.info(`[ReferralRepository] Referral created: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error creating referral: ${error.message}`);
    throw error;
  }
}

/**
 * Update referral
 */
async function update(referralId, updateData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('referrals')
        .update(updateData)
        .eq('id', referralId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[ReferralRepository] Error updating referral: ${error.message}`);
      throw error;
    }

    logger.info(`[ReferralRepository] Referral updated: ${referralId}`);
    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error updating referral: ${error.message}`);
    throw error;
  }
}

/**
 * Complete referral
 */
async function completeReferral(referralId, rewardPoints = 100) {
  try {
    const { data, error } = await db.query(d =>
      d.from('referrals')
        .update({
          status: 'completed',
          reward_points: rewardPoints,
          reward_claimed_at: new Date().toISOString(),
        })
        .eq('id', referralId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[ReferralRepository] Error completing referral: ${error.message}`);
      throw error;
    }

    logger.info(`[ReferralRepository] Referral completed: ${referralId}`);
    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error completing referral: ${error.message}`);
    throw error;
  }
}

/**
 * Get referral stats
 */
async function getReferralStats(userId) {
  try {
    const { data, error } = await db.query(d =>
      d.rpc('get_referral_stats', { p_user_id: userId })
    );

    if (error) {
      logger.error(`[ReferralRepository] Error getting referral stats: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error getting referral stats: ${error.message}`);
    throw error;
  }
}

/**
 * Create referral reward
 */
async function createReward(rewardData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('referral_rewards')
        .insert(rewardData)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[ReferralRepository] Error creating reward: ${error.message}`);
      throw error;
    }

    logger.info(`[ReferralRepository] Reward created: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error creating reward: ${error.message}`);
    throw error;
  }
}

/**
 * Get rewards by user ID
 */
async function getRewardsByUserId(userId, status = null) {
  try {
    let query = db.query(d =>
      d.from('referral_rewards')
        .select('*')
        .eq('user_id', userId)
    );

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error(`[ReferralRepository] Error getting rewards by user: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error getting rewards by user: ${error.message}`);
    throw error;
  }
}

/**
 * Claim reward
 */
async function claimReward(rewardId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('referral_rewards')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
        })
        .eq('id', rewardId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[ReferralRepository] Error claiming reward: ${error.message}`);
      throw error;
    }

    logger.info(`[ReferralRepository] Reward claimed: ${rewardId}`);
    return data;
  } catch (error) {
    logger.error(`[ReferralRepository] Error claiming reward: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findByCode,
  findByReferrerId,
  findByReferredUserId,
  create,
  update,
  completeReferral,
  getReferralStats,
  createReward,
  getRewardsByUserId,
  claimReward,
};
