'use strict';

/**
 * Onboarding DTOs
 * ==============
 * Data transfer objects for onboarding system.
 */

/**
 * Convert database row to onboarding DTO
 */
function toOnboardingDTO(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    user_id: row.user_id,
    favorite_countries: row.favorite_countries || [],
    favorite_teams: row.favorite_teams || [],
    favorite_competitions: row.favorite_competitions || [],
    interests: row.interests || [],
    user_mode: row.user_mode || 'viewer',
    experience_level: row.experience_level || 'casual',
    notifications_enabled: row.notifications_enabled !== false,
    onboarding_version: row.onboarding_version || '1.0',
    completed_at: row.completed_at,
    is_completed: row.is_completed || false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert database rows to onboarding DTOs
 */
function toOnboardingDTOs(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(toOnboardingDTO);
}

/**
 * Convert request body to onboarding data
 */
function toOnboardingData(body) {
  return {
    favorite_countries: body.favorite_countries || [],
    favorite_teams: body.favorite_teams || [],
    favorite_competitions: body.favorite_competitions || [],
    interests: body.interests || [],
    user_mode: body.user_mode || 'viewer',
    experience_level: body.experience_level || 'casual',
    notifications_enabled: body.notifications_enabled !== false,
  };
}

/**
 * Convert request body to onboarding completion data
 */
function toOnboardingCompletionData(body) {
  return {
    ...toOnboardingData(body),
    is_completed: true,
    completed_at: new Date().toISOString(),
  };
}

/**
 * Public onboarding DTO (for sharing)
 */
function toPublicOnboardingDTO(row) {
  const dto = toOnboardingDTO(row);
  if (!dto) return null;
  
  // Remove sensitive fields if any
  return dto;
}

/**
 * Onboarding statistics DTO
 */
function toOnboardingStatsDTO(stats) {
  return {
    total_users: stats.total_users || 0,
    completed_users: stats.completed_users || 0,
    completion_rate: stats.completion_rate || 0,
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
  toOnboardingDTO,
  toOnboardingDTOs,
  toOnboardingData,
  toOnboardingCompletionData,
  toPublicOnboardingDTO,
  toOnboardingStatsDTO,
  successResponse,
  errorResponse,
};
