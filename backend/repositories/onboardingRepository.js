'use strict';

/**
 * Onboarding Repository
 * =====================
 * Database operations for onboarding data using Supabase.
 */

const db = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Find onboarding by user ID
 */
async function findByUserId(userId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_onboarding')
        .select('*')
        .eq('user_id', userId)
        .single()
    );

    if (error) {
      logger.error(`[OnboardingRepository] Error finding onboarding: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[OnboardingRepository] Error finding onboarding: ${error.message}`);
    throw error;
  }
}

/**
 * Create onboarding record
 */
async function create(onboardingData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_onboarding')
        .insert(onboardingData)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[OnboardingRepository] Error creating onboarding: ${error.message}`);
      throw error;
    }

    logger.info(`[OnboardingRepository] Onboarding created for user: ${onboardingData.user_id}`);
    return data;
  } catch (error) {
    logger.error(`[OnboardingRepository] Error creating onboarding: ${error.message}`);
    throw error;
  }
}

/**
 * Update onboarding record
 */
async function update(userId, updateData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_onboarding')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[OnboardingRepository] Error updating onboarding: ${error.message}`);
      throw error;
    }

    logger.info(`[OnboardingRepository] Onboarding updated for user: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`[OnboardingRepository] Error updating onboarding: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert onboarding record (create or update)
 */
async function upsert(userId, onboardingData) {
  try {
    const existing = await findByUserId(userId);

    if (existing) {
      return await update(userId, onboardingData);
    } else {
      return await create({ ...onboardingData, user_id: userId });
    }
  } catch (error) {
    logger.error(`[OnboardingRepository] Error upserting onboarding: ${error.message}`);
    throw error;
  }
}

/**
 * Mark onboarding as completed
 */
async function markCompleted(userId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_onboarding')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[OnboardingRepository] Error marking onboarding completed: ${error.message}`);
      throw error;
    }

    logger.info(`[OnboardingRepository] Onboarding marked completed for user: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`[OnboardingRepository] Error marking onboarding completed: ${error.message}`);
    throw error;
  }
}

/**
 * Get onboarding completion statistics
 */
async function getCompletionStats() {
  try {
    const { data, error } = await db.query(d =>
      d.rpc('get_onboarding_completion_rate')
    );

    if (error) {
      logger.error(`[OnboardingRepository] Error getting completion stats: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[OnboardingRepository] Error getting completion stats: ${error.message}`);
    throw error;
  }
}

/**
 * Get onboarding by version
 */
async function findByVersion(version) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_onboarding')
        .select('*')
        .eq('onboarding_version', version)
    );

    if (error) {
      logger.error(`[OnboardingRepository] Error finding onboarding by version: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[OnboardingRepository] Error finding onboarding by version: ${error.message}`);
    throw error;
  }
}

/**
 * Delete onboarding record
 */
async function deleteByUserId(userId) {
  try {
    const { error } = await db.query(d =>
      d.from('user_onboarding')
        .delete()
        .eq('user_id', userId)
    );

    if (error) {
      logger.error(`[OnboardingRepository] Error deleting onboarding: ${error.message}`);
      throw error;
    }

    logger.info(`[OnboardingRepository] Onboarding deleted for user: ${userId}`);
    return true;
  } catch (error) {
    logger.error(`[OnboardingRepository] Error deleting onboarding: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findByUserId,
  create,
  update,
  upsert,
  markCompleted,
  getCompletionStats,
  findByVersion,
  deleteByUserId,
};
