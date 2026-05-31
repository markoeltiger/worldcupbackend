'use strict';

/**
 * Interests DTOs
 * ==============
 * Data transfer objects for user interests.
 */

/**
 * Convert database row to interests DTO
 */
function toInterestsDTO(row) {
  if (!row) return null;
  
  return {
    favorite_countries: row.favorite_countries || [],
    favorite_teams: row.favorite_teams || [],
    favorite_competitions: row.favorite_competitions || [],
    favorite_players: row.favorite_players || [],
    favorite_clubs: row.favorite_clubs || [],
    interests: row.interests || [],
  };
}

/**
 * Convert request body to interests data
 */
function toInterestsData(body) {
  return {
    favorite_countries: body.favorite_countries || [],
    favorite_teams: body.favorite_teams || [],
    favorite_competitions: body.favorite_competitions || [],
    favorite_players: body.favorite_players || [],
    favorite_clubs: body.favorite_clubs || [],
    interests: body.interests || [],
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
  toInterestsDTO,
  toInterestsData,
  successResponse,
  errorResponse,
};
