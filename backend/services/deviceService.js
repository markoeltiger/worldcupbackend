'use strict';

/**
 * Device Service
 * ==============
 * Business logic for device management and FCM token handling.
 */

const deviceRepository = require('../repositories/deviceRepository');
const deviceDto = require('../dtos/deviceDto');
const deviceValidator = require('../validators/deviceValidator');
const logger = require('../utils/logger');

/**
 * Register device
 */
async function registerDevice(userId, deviceData, ipAddress = null, userAgent = null) {
  try {
    // Validate device data
    const validation = deviceValidator.validateDeviceRegistration(deviceData);
    if (!validation.valid) {
      return deviceDto.errorResponse('VALIDATION_ERROR', 'Invalid device data', validation.errors);
    }

    // Convert to device data
    const data = deviceDto.toDeviceData(deviceData);
    data.user_id = userId;

    // Check if device with same FCM token already exists
    const existingDevice = await deviceRepository.findByFCMToken(data.fcm_token);
    
    if (existingDevice) {
      // Update existing device
      const updatedDevice = await deviceRepository.update(existingDevice.id, {
        ...data,
        last_seen_at: new Date().toISOString(),
      });
      
      logger.info(`[DeviceService] Device updated for user: ${userId}`);
      return deviceDto.successResponse(
        deviceDto.toDeviceDTO(updatedDevice),
        'Device updated successfully'
      );
    }

    // Create new device
    const device = await deviceRepository.create(data);

    // Deactivate old devices (keep only last 5 active)
    await deviceRepository.deactivateOldDevices(userId);

    logger.info(`[DeviceService] Device registered for user: ${userId}`);
    return deviceDto.successResponse(
      deviceDto.toDeviceDTO(device),
      'Device registered successfully'
    );
  } catch (error) {
    logger.error(`[DeviceService] Error registering device: ${error.message}`);
    throw error;
  }
}

/**
 * Get user devices
 */
async function getUserDevices(userId, activeOnly = false) {
  try {
    const devices = await deviceRepository.findByUserId(userId, activeOnly);
    
    return {
      success: true,
      data: deviceDto.toDeviceDTOs(devices),
    };
  } catch (error) {
    logger.error(`[DeviceService] Error getting user devices: ${error.message}`);
    throw error;
  }
}

/**
 * Get active devices
 */
async function getActiveDevices(userId) {
  try {
    const devices = await deviceRepository.getActiveDevices(userId);
    
    return {
      success: true,
      data: deviceDto.toDeviceDTOs(devices),
    };
  } catch (error) {
    logger.error(`[DeviceService] Error getting active devices: ${error.message}`);
    throw error;
  }
}

/**
 * Update device
 */
async function updateDevice(userId, deviceId, updateData, ipAddress = null, userAgent = null) {
  try {
    // Validate update data
    const validation = deviceValidator.validateDeviceUpdate(updateData);
    if (!validation.valid) {
      return deviceDto.errorResponse('VALIDATION_ERROR', 'Invalid device data', validation.errors);
    }

    // Check if device belongs to user
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      return deviceDto.errorResponse('DEVICE_NOT_FOUND', 'Device not found');
    }

    if (device.user_id !== userId) {
      return deviceDto.errorResponse('FORBIDDEN', 'You do not have permission to update this device');
    }

    // Convert to update data
    const data = deviceDto.toDeviceData(updateData);
    data.last_seen_at = new Date().toISOString();

    // Update device
    const updatedDevice = await deviceRepository.update(deviceId, data);

    logger.info(`[DeviceService] Device updated: ${deviceId}`);
    return deviceDto.successResponse(
      deviceDto.toDeviceDTO(updatedDevice),
      'Device updated successfully'
    );
  } catch (error) {
    logger.error(`[DeviceService] Error updating device: ${error.message}`);
    throw error;
  }
}

/**
 * Delete device
 */
async function deleteDevice(userId, deviceId, ipAddress = null, userAgent = null) {
  try {
    // Check if device belongs to user
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      return deviceDto.errorResponse('DEVICE_NOT_FOUND', 'Device not found');
    }

    if (device.user_id !== userId) {
      return deviceDto.errorResponse('FORBIDDEN', 'You do not have permission to delete this device');
    }

    // Delete device
    await deviceRepository.deleteById(deviceId);

    logger.info(`[DeviceService] Device deleted: ${deviceId}`);
    return {
      success: true,
      message: 'Device deleted successfully',
    };
  } catch (error) {
    logger.error(`[DeviceService] Error deleting device: ${error.message}`);
    throw error;
  }
}

/**
 * Deactivate device
 */
async function deactivateDevice(userId, deviceId, ipAddress = null, userAgent = null) {
  try {
    // Check if device belongs to user
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      return deviceDto.errorResponse('DEVICE_NOT_FOUND', 'Device not found');
    }

    if (device.user_id !== userId) {
      return deviceDto.errorResponse('FORBIDDEN', 'You do not have permission to deactivate this device');
    }

    // Deactivate device
    const deactivatedDevice = await deviceRepository.deactivate(deviceId);

    logger.info(`[DeviceService] Device deactivated: ${deviceId}`);
    return deviceDto.successResponse(
      deviceDto.toDeviceDTO(deactivatedDevice),
      'Device deactivated successfully'
    );
  } catch (error) {
    logger.error(`[DeviceService] Error deactivating device: ${error.message}`);
    throw error;
  }
}

/**
 * Update FCM token
 */
async function updateFCMToken(userId, deviceId, fcmToken, ipAddress = null, userAgent = null) {
  try {
    // Validate FCM token
    const validation = deviceValidator.validateFCMToken(fcmToken);
    if (!validation.valid) {
      return deviceDto.errorResponse('VALIDATION_ERROR', 'Invalid FCM token', validation.errors);
    }

    // Check if device belongs to user
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      return deviceDto.errorResponse('DEVICE_NOT_FOUND', 'Device not found');
    }

    if (device.user_id !== userId) {
      return deviceDto.errorResponse('FORBIDDEN', 'You do not have permission to update this device');
    }

    // Update FCM token
    const updatedDevice = await deviceRepository.updateFCMToken(deviceId, fcmToken);

    logger.info(`[DeviceService] FCM token updated for device: ${deviceId}`);
    return deviceDto.successResponse(
      deviceDto.toDeviceDTO(updatedDevice),
      'FCM token updated successfully'
    );
  } catch (error) {
    logger.error(`[DeviceService] Error updating FCM token: ${error.message}`);
    throw error;
  }
}

/**
 * Get FCM tokens for user
 */
async function getFCMTokens(userId, activeOnly = true) {
  try {
    const tokens = await deviceRepository.getFCMTokens(userId, activeOnly);
    
    return {
      success: true,
      data: {
        tokens,
        count: tokens.length,
      },
    };
  } catch (error) {
    logger.error(`[DeviceService] Error getting FCM tokens: ${error.message}`);
    throw error;
  }
}

/**
 * Update last seen
 */
async function updateLastSeen(deviceId) {
  try {
    const device = await deviceRepository.updateLastSeen(deviceId);
    return device;
  } catch (error) {
    logger.error(`[DeviceService] Error updating last seen: ${error.message}`);
    throw error;
  }
}

module.exports = {
  registerDevice,
  getUserDevices,
  getActiveDevices,
  updateDevice,
  deleteDevice,
  deactivateDevice,
  updateFCMToken,
  getFCMTokens,
  updateLastSeen,
};
