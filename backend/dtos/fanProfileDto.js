'use strict';

/**
 * Fan Profile DTOs
 * ================
 * Data transfer objects for World Cup fan profile.
 */

/**
 * Convert database row to fan profile DTO
 */
function toFanProfileDTO(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    user_id: row.user_id,
    favorite_player: row.favorite_player,
    favorite_legend: row.favorite_legend,
    fan_since: row.fan_since,
    world_cups_watched: row.world_cups_watched || 0,
    favorite_world_cup_moment: row.favorite_world_cup_moment,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert request body to fan profile data
 */
function toFanProfileData(body) {
  return {
    favorite_player: body.favorite_player,
    favorite_legend: body.favorite_legend,
    fan_since: body.fan_since,
    world_cups_watched: body.world_cups_watched || 0,
    favorite_world_cup_moment: body.favorite_world_cup_moment,
  };
}

/**
 * Success response DTO
 */
function successResponse(data, message = 'Success') {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Error response DTO
 */
function errorResponse(code, message, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return response;
}

module.exports = {
  toFanProfileDTO,
  toFanProfileData,
  successResponse,
  errorResponse,
};
