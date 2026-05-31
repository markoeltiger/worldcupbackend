'use strict';

/**
 * User Validators
 * ================
 * Validation functions for user-related operations.
 * Ensures data integrity and security.
 */

const logger = require('../utils/logger');

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 */
function validateUsername(username) {
  if (!username) return false;
  
  // Username: 3-30 characters, alphanumeric, underscores, hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
function validateCountryCode(countryCode) {
  if (!countryCode) return false;
  
  const countryCodeRegex = /^[A-Z]{2}$/;
  return countryCodeRegex.test(countryCode);
}

/**
 * Validate language code (ISO 639-1)
 */
function validateLanguageCode(languageCode) {
  if (!languageCode) return false;
  
  const languageCodeRegex = /^[a-z]{2}$/;
  return languageCodeRegex.test(languageCode);
}

/**
 * Validate timezone
 */
function validateTimezone(timezone) {
  if (!timezone) return false;
  
  // Common timezones
  const validTimezones = [
    'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Asia/Singapore',
    'Australia/Sydney', 'Pacific/Auckland',
  ];
  
  return validTimezones.includes(timezone);
}

/**
 * Validate display name
 */
function validateDisplayName(displayName) {
  if (!displayName) return false;
  
  // Display name: 2-50 characters, letters, spaces, hyphens, apostrophes
  const displayNameRegex = /^[a-zA-Z\s'-]{2,50}$/;
  return displayNameRegex.test(displayName);
}

/**
 * Validate bio
 */
function validateBio(bio) {
  if (!bio) return true; // Bio is optional
  
  // Bio: max 500 characters
  return bio.length <= 500;
}

/**
 * Validate URL
 */
function validateURL(url) {
  if (!url) return true; // URL is optional
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate user update data
 */
function validateUserUpdate(updateData) {
  const errors = [];

  if (updateData.email && !validateEmail(updateData.email)) {
    errors.push('Invalid email format');
  }

  if (updateData.username && !validateUsername(updateData.username)) {
    errors.push('Invalid username format (3-30 characters, alphanumeric, underscores, hyphens)');
  }

  if (updateData.display_name && !validateDisplayName(updateData.display_name)) {
    errors.push('Invalid display name format (2-50 characters, letters, spaces, hyphens, apostrophes)');
  }

  if (updateData.photo_url && !validateURL(updateData.photo_url)) {
    errors.push('Invalid photo URL format');
  }

  if (updateData.country && !validateCountryCode(updateData.country)) {
    errors.push('Invalid country code (2-letter ISO code)');
  }

  if (updateData.favorite_country && !validateCountryCode(updateData.favorite_country)) {
    errors.push('Invalid favorite country code (2-letter ISO code)');
  }

  if (updateData.language && !validateLanguageCode(updateData.language)) {
    errors.push('Invalid language code (2-letter ISO code)');
  }

  if (updateData.timezone && !validateTimezone(updateData.timezone)) {
    errors.push('Invalid timezone');
  }

  if (updateData.bio && !validateBio(updateData.bio)) {
    errors.push('Bio must be 500 characters or less');
  }

  // Validate arrays
  if (updateData.favorite_teams && !Array.isArray(updateData.favorite_teams)) {
    errors.push('favorite_teams must be an array');
  }

  if (updateData.favorite_leagues && !Array.isArray(updateData.favorite_leagues)) {
    errors.push('favorite_leagues must be an array');
  }

  if (updateData.favorite_players && !Array.isArray(updateData.favorite_players)) {
    errors.push('favorite_players must be an array');
  }

  // Validate boolean fields
  if (updateData.public_profile !== undefined && typeof updateData.public_profile !== 'boolean') {
    errors.push('public_profile must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate user preferences update data
 */
function validatePreferencesUpdate(updateData) {
  const errors = [];

  const booleanFields = [
    'notifications_enabled',
    'match_notifications',
    'goal_notifications',
    'favorite_team_notifications',
    'world_cup_notifications',
    'prediction_notifications',
    'marketing_notifications',
    'push_notifications',
    'email_notifications',
    'dark_mode',
  ];

  for (const field of booleanFields) {
    if (updateData[field] !== undefined && typeof updateData[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }

  if (updateData.language && !validateLanguageCode(updateData.language)) {
    errors.push('Invalid language code (2-letter ISO code)');
  }

  if (updateData.timezone && !validateTimezone(updateData.timezone)) {
    errors.push('Invalid timezone');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate guest migration data
 */
function validateGuestMigration(migrationData) {
  const errors = [];

  if (!migrationData.anonymous_uid) {
    errors.push('anonymous_uid is required');
  }

  if (!migrationData.email) {
    errors.push('email is required');
  } else if (!validateEmail(migrationData.email)) {
    errors.push('Invalid email format');
  }

  if (!migrationData.password) {
    errors.push('password is required');
  } else if (migrationData.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (migrationData.display_name && !validateDisplayName(migrationData.display_name)) {
    errors.push('Invalid display name format');
  }

  if (migrationData.preserve_data !== undefined && typeof migrationData.preserve_data !== 'boolean') {
    errors.push('preserve_data must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate RevenueCat webhook data
 */
function validateRevenueCatWebhook(webhookData) {
  const errors = [];

  if (!webhookData.event_type) {
    errors.push('event_type is required');
  }

  if (!webhookData.customer_id) {
    errors.push('customer_id is required');
  }

  if (!webhookData.product_id) {
    errors.push('product_id is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate pagination parameters
 */
function validatePagination(page, limit) {
  const errors = [];

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    errors.push('page must be a positive integer');
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    errors.push('limit must be between 1 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
    page: pageNum || 1,
    limit: limitNum || 20,
  };
}

/**
 * Validate user ID
 */
function validateUserId(userId) {
  if (!userId) {
    return {
      valid: false,
      errors: ['User ID is required'],
    };
  }

  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return {
      valid: false,
      errors: ['Invalid user ID format'],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

module.exports = {
  validateEmail,
  validateUsername,
  validateCountryCode,
  validateLanguageCode,
  validateTimezone,
  validateDisplayName,
  validateBio,
  validateURL,
  validateUserUpdate,
  validatePreferencesUpdate,
  validateGuestMigration,
  validateRevenueCatWebhook,
  validatePagination,
  validateUserId,
};
