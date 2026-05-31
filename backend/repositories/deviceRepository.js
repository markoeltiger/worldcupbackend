'use strict';

/**
 * Device Repository
 * =================
 * Database operations for device management using Supabase.
 */

const db = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Find device by ID
 */
async function findById(deviceId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_devices')
        .select('*')
        .eq('id', deviceId)
        .single()
    );

    if (error) {
      logger.error(`[DeviceRepository] Error finding device: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error finding device: ${error.message}`);
    throw error;
  }
}

/**
 * Find devices by user ID
 */
async function findByUserId(userId, activeOnly = false) {
  try {
    let query = db.query(d =>
      d.from('user_devices')
        .select('*')
        .eq('user_id', userId)
    );

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('last_seen_at', { ascending: false });

    if (error) {
      logger.error(`[DeviceRepository] Error finding user devices: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error finding user devices: ${error.message}`);
    throw error;
  }
}

/**
 * Find device by FCM token
 */
async function findByFCMToken(fcmToken) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_devices')
        .select('*')
        .eq('fcm_token', fcmToken)
        .single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      logger.error(`[DeviceRepository] Error finding device by FCM token: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error finding device by FCM token: ${error.message}`);
    throw error;
  }
}

/**
 * Create device
 */
async function create(deviceData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_devices')
        .insert(deviceData)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[DeviceRepository] Error creating device: ${error.message}`);
      throw error;
    }

    logger.info(`[DeviceRepository] Device created for user: ${deviceData.user_id}`);
    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error creating device: ${error.message}`);
    throw error;
  }
}

/**
 * Update device
 */
async function update(deviceId, updateData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_devices')
        .update(updateData)
        .eq('id', deviceId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[DeviceRepository] Error updating device: ${error.message}`);
      throw error;
    }

    logger.info(`[DeviceRepository] Device updated: ${deviceId}`);
    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error updating device: ${error.message}`);
    throw error;
  }
}

/**
 * Delete device
 */
async function deleteById(deviceId) {
  try {
    const { error } = await db.query(d =>
      d.from('user_devices')
        .delete()
        .eq('id', deviceId)
    );

    if (error) {
      logger.error(`[DeviceRepository] Error deleting device: ${error.message}`);
      throw error;
    }

    logger.info(`[DeviceRepository] Device deleted: ${deviceId}`);
    return true;
  } catch (error) {
    logger.error(`[DeviceRepository] Error deleting device: ${error.message}`);
    throw error;
  }
}

/**
 * Deactivate device
 */
async function deactivate(deviceId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_devices')
        .update({ is_active: false })
        .eq('id', deviceId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[DeviceRepository] Error deactivating device: ${error.message}`);
      throw error;
    }

    logger.info(`[DeviceRepository] Device deactivated: ${deviceId}`);
    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error deactivating device: ${error.message}`);
    throw error;
  }
}

/**
 * Update FCM token
 */
async function updateFCMToken(deviceId, fcmToken) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_devices')
        .update({ fcm_token })
        .eq('id', deviceId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[DeviceRepository] Error updating FCM token: ${error.message}`);
      throw error;
    }

    logger.info(`[DeviceRepository] FCM token updated for device: ${deviceId}`);
    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error updating FCM token: ${error.message}`);
    throw error;
  }
}

/**
 * Update last seen timestamp
 */
async function updateLastSeen(deviceId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('user_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', deviceId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[DeviceRepository] Error updating last seen: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error updating last seen: ${error.message}`);
    throw error;
  }
}

/**
 * Get active devices for user
 */
async function getActiveDevices(userId) {
  try {
    const { data, error } = await db.query(d =>
      d.rpc('get_user_active_devices', { p_user_id: userId })
    );

    if (error) {
      logger.error(`[DeviceRepository] Error getting active devices: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[DeviceRepository] Error getting active devices: ${error.message}`);
    throw error;
  }
}

/**
 * Deactivate old devices (keep only last 5 active)
 */
async function deactivateOldDevices(userId) {
  try {
    const { error } = await db.query(d =>
      d.rpc('deactivate_old_devices', { p_user_id: userId })
    );

    if (error) {
      logger.error(`[DeviceRepository] Error deactivating old devices: ${error.message}`);
      throw error;
    }

    logger.info(`[DeviceRepository] Old devices deactivated for user: ${userId}`);
    return true;
  } catch (error) {
    logger.error(`[DeviceRepository] Error deactivating old devices: ${error.message}`);
    throw error;
  }
}

/**
 * Get all FCM tokens for user
 */
async function getFCMTokens(userId, activeOnly = true) {
  try {
    let query = db.query(d =>
      d.from('user_devices')
        .select('fcm_token')
        .eq('user_id', userId)
    );

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error(`[DeviceRepository] Error getting FCM tokens: ${error.message}`);
      throw error;
    }

    return data.map(d => d.fcm_token).filter(t => t);
  } catch (error) {
    logger.error(`[DeviceRepository] Error getting FCM tokens: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findById,
  findByUserId,
  findByFCMToken,
  create,
  update,
  deleteById,
  deactivate,
  updateFCMToken,
  updateLastSeen,
  getActiveDevices,
  deactivateOldDevices,
  getFCMTokens,
};
