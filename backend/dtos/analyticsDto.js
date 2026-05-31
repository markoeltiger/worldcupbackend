'use strict';

/**
 * Analytics DTOs
 * ==============
 * Data transfer objects for analytics events.
 */

/**
 * Convert database row to analytics event DTO
 */
function toAnalyticsEventDTO(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    user_id: row.user_id,
    event_name: row.event_name,
    event_category: row.event_category,
    event_data: row.event_data,
    platform: row.platform,
    app_version: row.app_version,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at,
  };
}

/**
 * Convert database rows to analytics event DTOs
 */
function toAnalyticsEventDTOs(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(toAnalyticsEventDTO);
}

/**
 * Convert request body to analytics event data
 */
function toAnalyticsEventData(body) {
  return {
    event_name: body.event_name,
    event_category: body.event_category,
    event_data: body.event_data,
    platform: body.platform,
    app_version: body.app_version,
    ip_address: body.ip_address,
    user_agent: body.user_agent,
  };
}

/**
 * Convert database row to analytics stats DTO
 */
function toAnalyticsStatsDTO(row) {
  if (!row) return null;
  
  return {
    total_events: row.total_events || 0,
    unique_events: row.unique_events || 0,
    most_common_event: row.most_common_event,
    event_count: row.event_count || 0,
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
  toAnalyticsEventDTO,
  toAnalyticsEventDTOs,
  toAnalyticsEventData,
  toAnalyticsStatsDTO,
  successResponse,
  errorResponse,
};
