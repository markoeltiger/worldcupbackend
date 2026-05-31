'use strict';

/**
 * Fan Profile Validators
 * ======================
 * Validation functions for World Cup fan profile data.
 */

const logger = require('../utils/logger');

/**
 * Validate favorite player
 */
function validateFavoritePlayer(player) {
  if (!player || typeof player !== 'string') {
    return { valid: false, errors: ['favorite_player must be a string'] };
  }
  
  if (player.length > 255) {
    return { valid: false, errors: ['favorite_player must be less than 255 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate favorite legend
 */
function validateFavoriteLegend(legend) {
  if (!legend || typeof legend !== 'string') {
    return { valid: false, errors: ['favorite_legend must be a string'] };
  }
  
  if (legend.length > 255) {
    return { valid: false, errors: ['favorite_legend must be less than 255 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate fan since year
 */
function validateFanSince(fanSince) {
  if (!fanSince || typeof fanSince !== 'number') {
    return { valid: false, errors: ['fan_since must be a number'] };
  }
  
  const currentYear = new Date().getFullYear();
  const minYear = 1930; // First World Cup
  
  if (fanSince < minYear || fanSince > currentYear) {
    return { 
      valid: false, 
      errors: [`fan_since must be between ${minYear} and ${currentYear}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate world cups watched
 */
function validateWorldCupsWatched(worldCupsWatched) {
  if (worldCupsWatched === undefined || worldCupsWatched === null) {
    return { valid: true }; // Optional
  }
  
  if (typeof worldCupsWatched !== 'number') {
    return { valid: false, errors: ['world_cups_watched must be a number'] };
  }
  
  if (worldCupsWatched < 0 || worldCupsWatched > 25) {
    return { valid: false, errors: ['world_cups_watched must be between 0 and 25'] };
  }
  
  return { valid: true };
}

/**
 * Validate favorite world cup moment
 */
function validateFavoriteWorldCupMoment(moment) {
  if (!moment || typeof moment !== 'string') {
    return { valid: false, errors: ['favorite_world_cup_moment must be a string'] };
  }
  
  if (moment.length > 1000) {
    return { valid: false, errors: ['favorite_world_cup_moment must be less than 1000 characters'] };
  }
  
  return { valid: true };
}

/**
 * Validate fan profile data
 */
function validateFanProfile(data) {
  const errors = [];
  
  // All fields are optional for updates
  if (data.favorite_player) {
    const playerValidation = validateFavoritePlayer(data.favorite_player);
    if (!playerValidation.valid) {
      errors.push(...playerValidation.errors);
    }
  }
  
  if (data.favorite_legend) {
    const legendValidation = validateFavoriteLegend(data.favorite_legend);
    if (!legendValidation.valid) {
      errors.push(...legendValidation.errors);
    }
  }
  
  if (data.fan_since) {
    const sinceValidation = validateFanSince(data.fan_since);
    if (!sinceValidation.valid) {
      errors.push(...sinceValidation.errors);
    }
  }
  
  if (data.world_cups_watched !== undefined) {
    const watchedValidation = validateWorldCupsWatched(data.world_cups_watched);
    if (!watchedValidation.valid) {
      errors.push(...watchedValidation.errors);
    }
  }
  
  if (data.favorite_world_cup_moment) {
    const momentValidation = validateFavoriteWorldCupMoment(data.favorite_world_cup_moment);
    if (!momentValidation.valid) {
      errors.push(...momentValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

module.exports = {
  validateFavoritePlayer,
  validateFavoriteLegend,
  validateFanSince,
  validateWorldCupsWatched,
  validateFavoriteWorldCupMoment,
  validateFanProfile,
};
