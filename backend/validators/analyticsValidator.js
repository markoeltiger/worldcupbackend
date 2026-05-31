'use strict';

/**
 * Analytics Validators
 * ====================
 * Validation functions for analytics events.
 */

const logger = require('../utils/logger');

/**
 * Validate event name
 */
function validateEventName(eventName) {
  if (!eventName || typeof eventName !== 'string') {
    return { valid: false, errors: ['event_name is required and must be a string'] };
  }
  
  if (eventName.length > 100) {
    return { valid: false, errors: ['event_name must be less than 100 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate event category
 */
function validateEventCategory(category) {
  if (!category || typeof category !== 'string') {
    return { valid: false, errors: ['event_category is required and must be a string'] };
  }
  
  if (category.length > 100) {
    return { valid: false, errors: ['event_category must be less than 100 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate event data
 */
function validateEventData(data) {
  if (data === undefined || data === null) {
    return { valid: true }; // Optional
  }
  
  if (typeof data !== 'object') {
    return { valid: false, errors: ['event_data must be an object'] };
  }
  
  return { valid: true };
}

/**
 * Validate platform
 */
function validatePlatform(platform) {
  if (!platform || typeof platform !== 'string') {
    return { valid: false, errors: ['platform is required and must be a string'] };
  }
  
  const validPlatforms = ['ios', 'android', 'web'];
  if (!validPlatforms.includes(platform.toLowerCase())) {
    return { 
      valid: false, 
      errors: [`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate app version
 */
function validateAppVersion(version) {
  if (!version || typeof version !== 'string') {
    return { valid: false, errors: ['app_version is required and must be a string'] };
  }
  
  if (version.length > 50) {
    return { valid: false, errors: ['app_version must be less than 50 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate analytics event data
 */
function validateAnalyticsEvent(data) {
  const errors = [];
  
  // Validate event name (required)
  if (!data.event_name) {
    errors.push('event_name is required');
  } else {
    const nameValidation = validateEventName(data.event_name);
    if (!nameValidation.valid) {
      errors.push(...nameValidation.errors);
    }
  }
  
  // Validate event category (optional)
  if (data.event_category) {
    const categoryValidation = validateEventCategory(data.event_category);
    if (!categoryValidation.valid) {
      errors.push(...categoryValidation.errors);
    }
  }
  
  // Validate event data (optional)
  if (data.event_data !== undefined) {
    const dataValidation = validateEventData(data.event_data);
    if (!dataValidation.valid) {
      errors.push(...dataValidation.errors);
    }
  }
  
  // Validate platform (optional)
  if (data.platform) {
    const platformValidation = validatePlatform(data.platform);
    if (!platformValidation.valid) {
      errors.push(...platformValidation.errors);
    }
  }
  
  // Validate app version (optional)
  if (data.app_version) {
    const versionValidation = validateAppVersion(data.app_version);
    if (!versionValidation.valid) {
      errors.push(...versionValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

module.exports = {
  validateEventName,
  validateEventCategory,
  validateEventData,
  validatePlatform,
  validateAppVersion,
  validateAnalyticsEvent,
};
