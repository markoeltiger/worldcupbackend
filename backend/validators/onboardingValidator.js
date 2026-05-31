'use strict';

/**
 * Onboarding Validators
 * =====================
 * Validation functions for onboarding data.
 */

const logger = require('../utils/logger');

/**
 * Validate country codes
 */
function validateCountryCodes(countries) {
  if (!Array.isArray(countries)) {
    return { valid: false, errors: ['favorite_countries must be an array'] };
  }
  
  if (countries.length > 10) {
    return { valid: false, errors: ['Maximum 10 countries allowed'] };
  }
  
  const validCountryCodes = [
    'EG', 'AR', 'BR', 'DE', 'ES', 'FR', 'GB', 'IT', 'NL', 'PT',
    'US', 'CA', 'MX', 'AU', 'JP', 'KR', 'CN', 'IN', 'RU', 'SA',
    'QA', 'AE', 'NG', 'ZA', 'KE', 'MA', 'TN', 'DZ', 'SN', 'CI'
  ];
  
  const invalidCountries = countries.filter(c => !validCountryCodes.includes(c));
  if (invalidCountries.length > 0) {
    return { 
      valid: false, 
      errors: [`Invalid country codes: ${invalidCountries.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate team names
 */
function validateTeamNames(teams) {
  if (!Array.isArray(teams)) {
    return { valid: false, errors: ['favorite_teams must be an array'] };
  }
  
  if (teams.length > 20) {
    return { valid: false, errors: ['Maximum 20 teams allowed'] };
  }
  
  // Basic validation - teams should be non-empty strings
  const invalidTeams = teams.filter(t => !t || typeof t !== 'string' || t.trim().length === 0);
  if (invalidTeams.length > 0) {
    return { 
      valid: false, 
      errors: ['All team names must be non-empty strings'] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate competitions
 */
function validateCompetitions(competitions) {
  if (!Array.isArray(competitions)) {
    return { valid: false, errors: ['favorite_competitions must be an array'] };
  }
  
  if (competitions.length > 15) {
    return { valid: false, errors: ['Maximum 15 competitions allowed'] };
  }
  
  const validCompetitions = [
    'world_cup', 'champions_league', 'premier_league', 'la_liga',
    'bundesliga', 'serie_a', 'ligue_1', 'europa_league', 'europa_conference_league',
    'copa_libertadores', 'copa_america', 'euro', 'african_cup', 'afc_champions_league'
  ];
  
  const invalidCompetitions = competitions.filter(c => !validCompetitions.includes(c));
  if (invalidCompetitions.length > 0) {
    return { 
      valid: false, 
      errors: [`Invalid competitions: ${invalidCompetitions.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate interests
 */
function validateInterests(interests) {
  if (!Array.isArray(interests)) {
    return { valid: false, errors: ['interests must be an array'] };
  }
  
  if (interests.length === 0) {
    return { valid: false, errors: ['At least one interest is required'] };
  }
  
  if (interests.length > 10) {
    return { valid: false, errors: ['Maximum 10 interests allowed'] };
  }
  
  const validInterests = [
    'predictions', 'transfers', 'live_scores', 'player_stats',
    'fantasy', 'international_football', 'world_cup', 'tactics',
    'youth_football', 'womens_football'
  ];
  
  const invalidInterests = interests.filter(i => !validInterests.includes(i));
  if (invalidInterests.length > 0) {
    return { 
      valid: false, 
      errors: [`Invalid interests: ${invalidInterests.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate user mode
 */
function validateUserMode(userMode) {
  const validModes = ['viewer', 'predictor', 'analyst'];
  
  if (!userMode || typeof userMode !== 'string') {
    return { valid: false, errors: ['user_mode is required and must be a string'] };
  }
  
  if (!validModes.includes(userMode)) {
    return { 
      valid: false, 
      errors: [`Invalid user_mode. Must be one of: ${validModes.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate experience level
 */
function validateExperienceLevel(experienceLevel) {
  const validLevels = ['casual', 'regular', 'hardcore'];
  
  if (!experienceLevel || typeof experienceLevel !== 'string') {
    return { valid: false, errors: ['experience_level is required and must be a string'] };
  }
  
  if (!validLevels.includes(experienceLevel)) {
    return { 
      valid: false, 
      errors: [`Invalid experience_level. Must be one of: ${validLevels.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate notifications enabled
 */
function validateNotificationsEnabled(notificationsEnabled) {
  if (typeof notificationsEnabled !== 'boolean') {
    return { valid: false, errors: ['notifications_enabled must be a boolean'] };
  }
  
  return { valid: true };
}

/**
 * Validate onboarding completion data
 */
function validateOnboardingCompletion(data) {
  const errors = [];
  
  // Validate countries
  if (data.favorite_countries) {
    const countryValidation = validateCountryCodes(data.favorite_countries);
    if (!countryValidation.valid) {
      errors.push(...countryValidation.errors);
    }
  }
  
  // Validate teams
  if (data.favorite_teams) {
    const teamValidation = validateTeamNames(data.favorite_teams);
    if (!teamValidation.valid) {
      errors.push(...teamValidation.errors);
    }
  }
  
  // Validate competitions
  if (data.favorite_competitions) {
    const competitionValidation = validateCompetitions(data.favorite_competitions);
    if (!competitionValidation.valid) {
      errors.push(...competitionValidation.errors);
    }
  }
  
  // Validate interests (required)
  if (!data.interests || data.interests.length === 0) {
    errors.push('interests is required');
  } else {
    const interestValidation = validateInterests(data.interests);
    if (!interestValidation.valid) {
      errors.push(...interestValidation.errors);
    }
  }
  
  // Validate user mode
  if (data.user_mode) {
    const modeValidation = validateUserMode(data.user_mode);
    if (!modeValidation.valid) {
      errors.push(...modeValidation.errors);
    }
  }
  
  // Validate experience level
  if (data.experience_level) {
    const levelValidation = validateExperienceLevel(data.experience_level);
    if (!levelValidation.valid) {
      errors.push(...levelValidation.errors);
    }
  }
  
  // Validate notifications enabled
  if (data.notifications_enabled !== undefined) {
    const notificationValidation = validateNotificationsEnabled(data.notifications_enabled);
    if (!notificationValidation.valid) {
      errors.push(...notificationValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate onboarding update data
 */
function validateOnboardingUpdate(data) {
  const errors = [];
  
  // All fields are optional for updates
  if (data.favorite_countries) {
    const countryValidation = validateCountryCodes(data.favorite_countries);
    if (!countryValidation.valid) {
      errors.push(...countryValidation.errors);
    }
  }
  
  if (data.favorite_teams) {
    const teamValidation = validateTeamNames(data.favorite_teams);
    if (!teamValidation.valid) {
      errors.push(...teamValidation.errors);
    }
  }
  
  if (data.favorite_competitions) {
    const competitionValidation = validateCompetitions(data.favorite_competitions);
    if (!competitionValidation.valid) {
      errors.push(...competitionValidation.errors);
    }
  }
  
  if (data.interests) {
    const interestValidation = validateInterests(data.interests);
    if (!interestValidation.valid) {
      errors.push(...interestValidation.errors);
    }
  }
  
  if (data.user_mode) {
    const modeValidation = validateUserMode(data.user_mode);
    if (!modeValidation.valid) {
      errors.push(...modeValidation.errors);
    }
  }
  
  if (data.experience_level) {
    const levelValidation = validateExperienceLevel(data.experience_level);
    if (!levelValidation.valid) {
      errors.push(...levelValidation.errors);
    }
  }
  
  if (data.notifications_enabled !== undefined) {
    const notificationValidation = validateNotificationsEnabled(data.notifications_enabled);
    if (!notificationValidation.valid) {
      errors.push(...notificationValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

module.exports = {
  validateCountryCodes,
  validateTeamNames,
  validateCompetitions,
  validateInterests,
  validateUserMode,
  validateExperienceLevel,
  validateNotificationsEnabled,
  validateOnboardingCompletion,
  validateOnboardingUpdate,
};
