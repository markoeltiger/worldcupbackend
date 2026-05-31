'use strict';

/**
 * Device Validators
 * =================
 * Validation functions for device data.
 */

const logger = require('../utils/logger');

/**
 * Validate platform
 */
function validatePlatform(platform) {
  const validPlatforms = ['ios', 'android', 'web'];
  
  if (!platform || typeof platform !== 'string') {
    return { valid: false, errors: ['platform is required and must be a string'] };
  }
  
  if (!validPlatforms.includes(platform.toLowerCase())) {
    return { 
      valid: false, 
      errors: [`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate device model
 */
function validateDeviceModel(deviceModel) {
  if (!deviceModel || typeof deviceModel !== 'string') {
    return { valid: false, errors: ['device_model is required and must be a string'] };
  }
  
  if (deviceModel.length > 100) {
    return { valid: false, errors: ['device_model must be less than 100 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate OS version
 */
function validateOSVersion(osVersion) {
  if (!osVersion || typeof osVersion !== 'string') {
    return { valid: false, errors: ['os_version is required and must be a string'] };
  }
  
  if (osVersion.length > 50) {
    return { valid: false, errors: ['os_version must be less than 50 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate app version
 */
function validateAppVersion(appVersion) {
  if (!appVersion || typeof appVersion !== 'string') {
    return { valid: false, errors: ['app_version is required and must be a string'] };
  }
  
  if (appVersion.length > 50) {
    return { valid: false, errors: ['app_version must be less than 50 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate FCM token
 */
function validateFCMToken(fcmToken) {
  if (!fcmToken || typeof fcmToken !== 'string') {
    return { valid: false, errors: ['fcm_token is required and must be a string'] };
  }
  
  if (fcmToken.length < 100 || fcmToken.length > 500) {
    return { valid: false, errors: ['fcm_token must be between 100 and 500 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate is_active
 */
function validateIsActive(isActive) {
  if (typeof isActive !== 'boolean') {
    return { valid: false, errors: ['is_active must be a boolean'] };
  }
  
  return { valid: true };
}

/**
 * Validate device registration data
 */
function validateDeviceRegistration(data) {
  const errors = [];
  
  // Validate platform (required)
  if (!data.platform) {
    errors.push('platform is required');
  } else {
    const platformValidation = validatePlatform(data.platform);
    if (!platformValidation.valid) {
      errors.push(...platformValidation.errors);
    }
  }
  
  // Validate device model (required)
  if (!data.device_model) {
    errors.push('device_model is required');
  } else {
    const modelValidation = validateDeviceModel(data.device_model);
    if (!modelValidation.valid) {
      errors.push(...modelValidation.errors);
    }
  }
  
  // Validate OS version (required)
  if (!data.os_version) {
    errors.push('os_version is required');
  } else {
    const osValidation = validateOSVersion(data.os_version);
    if (!osValidation.valid) {
      errors.push(...osValidation.errors);
    }
  }
  
  // Validate app version (required)
  if (!data.app_version) {
    errors.push('app_version is required');
  } else {
    const appValidation = validateAppVersion(data.app_version);
    if (!appValidation.valid) {
      errors.push(...appValidation.errors);
    }
  }
  
  // Validate FCM token (required)
  if (!data.fcm_token) {
    errors.push('fcm_token is required');
  } else {
    const fcmValidation = validateFCMToken(data.fcm_token);
    if (!fcmValidation.valid) {
      errors.push(...fcmValidation.errors);
    }
  }
  
  // Validate is_active (optional)
  if (data.is_active !== undefined) {
    const activeValidation = validateIsActive(data.is_active);
    if (!activeValidation.valid) {
      errors.push(...activeValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate device update data
 */
function validateDeviceUpdate(data) {
  const errors = [];
  
  // All fields are optional for updates
  if (data.platform) {
    const platformValidation = validatePlatform(data.platform);
    if (!platformValidation.valid) {
      errors.push(...platformValidation.errors);
    }
  }
  
  if (data.device_model) {
    const modelValidation = validateDeviceModel(data.device_model);
    if (!modelValidation.valid) {
      errors.push(...modelValidation.errors);
    }
  }
  
  if (data.os_version) {
    const osValidation = validateOSVersion(data.os_version);
    if (!osValidation.valid) {
      errors.push(...osValidation.errors);
    }
  }
  
  if (data.app_version) {
    const appValidation = validateAppVersion(data.app_version);
    if (!appValidation.valid) {
      errors.push(...appValidation.errors);
    }
  }
  
  if (data.fcm_token) {
    const fcmValidation = validateFCMToken(data.fcm_token);
    if (!fcmValidation.valid) {
      errors.push(...fcmValidation.errors);
    }
  }
  
  if (data.is_active !== undefined) {
    const activeValidation = validateIsActive(data.is_active);
    if (!activeValidation.valid) {
      errors.push(...activeValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

module.exports = {
  validatePlatform,
  validateDeviceModel,
  validateOSVersion,
  validateAppVersion,
  validateFCMToken,
  validateIsActive,
  validateDeviceRegistration,
  validateDeviceUpdate,
};
