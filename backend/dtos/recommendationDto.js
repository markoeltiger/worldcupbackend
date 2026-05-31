'use strict';

/**
 * Recommendation DTOs
 * ===================
 * Data transfer objects for AI recommendations.
 */

/**
 * Convert to recommendation DTO
 */
function toRecommendationDTO(data) {
  if (!data) return null;
  
  return {
    type: data.type,
    id: data.id,
    name: data.name,
    reason: data.reason,
    confidence: data.confidence,
    metadata: data.metadata || {},
  };
}

/**
 * Convert to recommendations list DTO
 */
function toRecommendationsDTOs(items) {
  if (!items || !Array.isArray(items)) return [];
  return items.map(toRecommendationDTO);
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
  toRecommendationDTO,
  toRecommendationsDTOs,
  successResponse,
  errorResponse,
};
