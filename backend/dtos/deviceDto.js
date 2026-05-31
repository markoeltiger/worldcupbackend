'use strict';

/**
 * Device DTOs
 * ===========
 * Data transfer objects for device management.
 */

/**
 * Convert database row to device DTO
 */
function toDeviceDTO(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    user_id: row.user_id,
    platform: row.platform,
    device_model: row.device_model,
    os_version: row.os_version,
    app_version: row.app_version,
    fcm_token: row.fcm_token,
    is_active: row.is_active,
    last_seen_at: row.last_seen_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert database rows to device DTOs
 */
function toDeviceDTOs(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(toDeviceDTO);
}

/**
 * Convert request body to device data
 */
function toDeviceData(body) {
  return {
    platform: body.platform,
    device_model: body.device_model,
    os_version: body.os_version,
    app_version: body.app_version,
    fcm_token: body.fcm_token,
    is_active: body.is_active !== false,
  };
}

/**
 * Public device DTO (for sharing - without FCM token)
 */
function toPublicDeviceDTO(row) {
  const dto = toDeviceDTO(row);
  if (!dto) return null;
  
  // Remove sensitive FCM token
  delete dto.fcm_token;
  
  return dto;
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
  toDeviceDTO,
  toDeviceDTOs,
  toDeviceData,
  toPublicDeviceDTO,
  successResponse,
  errorResponse,
};
