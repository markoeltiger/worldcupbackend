'use strict';

/**
 * Referral DTOs
 * =============
 * Data transfer objects for referral system.
 */

/**
 * Convert database row to referral DTO
 */
function toReferralDTO(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    referral_code: row.referral_code,
    referrer_id: row.referrer_id,
    referred_user_id: row.referred_user_id,
    status: row.status,
    reward_points: row.reward_points || 0,
    reward_claimed_at: row.reward_claimed_at,
    ip_address: row.ip_address,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert database rows to referral DTOs
 */
function toReferralDTOs(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(toReferralDTO);
}

/**
 * Convert database row to referral reward DTO
 */
function toReferralRewardDTO(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    referral_id: row.referral_id,
    user_id: row.user_id,
    reward_type: row.reward_type,
    reward_amount: row.reward_amount,
    reward_description: row.reward_description,
    status: row.status,
    created_at: row.created_at,
    claimed_at: row.claimed_at,
    expires_at: row.expires_at,
  };
}

/**
 * Convert database rows to referral reward DTOs
 */
function toReferralRewardDTOs(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(toReferralRewardDTO);
}

/**
 * Convert database row to referral stats DTO
 */
function toReferralStatsDTO(row) {
  if (!row) return null;
  
  return {
    total_referrals: row.total_referrals || 0,
    completed_referrals: row.completed_referrals || 0,
    total_points_earned: row.total_points_earned || 0,
    pending_referrals: row.pending_referrals || 0,
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
  toReferralDTO,
  toReferralDTOs,
  toReferralRewardDTO,
  toReferralRewardDTOs,
  toReferralStatsDTO,
  successResponse,
  errorResponse,
};
