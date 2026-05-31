'use strict';

/**
 * Fan Profile Repository
 * ======================
 * Database operations for World Cup fan profile using Supabase.
 */

const db = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Find fan profile by user ID
 */
async function findByUserId(userId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('world_cup_fan_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      logger.error(`[FanProfileRepository] Error finding fan profile: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[FanProfileRepository] Error finding fan profile: ${error.message}`);
    throw error;
  }
}

/**
 * Create fan profile
 */
async function create(profileData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('world_cup_fan_profiles')
        .insert(profileData)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[FanProfileRepository] Error creating fan profile: ${error.message}`);
      throw error;
    }

    logger.info(`[FanProfileRepository] Fan profile created for user: ${profileData.user_id}`);
    return data;
  } catch (error) {
    logger.error(`[FanProfileRepository] Error creating fan profile: ${error.message}`);
    throw error;
  }
}

/**
 * Update fan profile
 */
async function update(userId, updateData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('world_cup_fan_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[FanProfileRepository] Error updating fan profile: ${error.message}`);
      throw error;
    }

    logger.info(`[FanProfileRepository] Fan profile updated for user: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`[FanProfileRepository] Error updating fan profile: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert fan profile (create or update)
 */
async function upsert(userId, profileData) {
  try {
    const existing = await findByUserId(userId);

    if (existing) {
      return await update(userId, profileData);
    } else {
      return await create({ ...profileData, user_id: userId });
    }
  } catch (error) {
    logger.error(`[FanProfileRepository] Error upserting fan profile: ${error.message}`);
    throw error;
  }
}

/**
 * Delete fan profile
 */
async function deleteByUserId(userId) {
  try {
    const { error } = await db.query(d =>
      d.from('world_cup_fan_profiles')
        .delete()
        .eq('user_id', userId)
    );

    if (error) {
      logger.error(`[FanProfileRepository] Error deleting fan profile: ${error.message}`);
      throw error;
    }

    logger.info(`[FanProfileRepository] Fan profile deleted for user: ${userId}`);
    return true;
  } catch (error) {
    logger.error(`[FanProfileRepository] Error deleting fan profile: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findByUserId,
  create,
  update,
  upsert,
  deleteByUserId,
};
