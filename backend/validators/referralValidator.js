'use strict';

/**
 * Referral Validators
 * ===================
 * Validation functions for referral system.
 */

const logger = require('../utils/logger');

/**
 * Validate referral code
 */
function validateReferralCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, errors: ['referral_code is required and must be a string'] };
  }
  
  if (code.length < 6 || code.length > 20) {
    return { valid: false, errors: ['referral_code must be between 6 and 20 characters'] };
  }
  
  if (!/^[A-Z0-9]+$/.test(code)) {
    return { valid: false, errors: ['referral_code must contain only uppercase letters and numbers'] };
  }
  
  return { valid: true };
}

/**
 * Validate referral status
 */
function validateReferralStatus(status) {
  const validStatuses = ['pending', 'completed', 'cancelled', 'fraud'];
  
  if (!status || typeof status !== 'string') {
    return { valid: false, errors: ['status is required and must be a string'] };
  }
  
  if (!validStatuses.includes(status)) {
    return { 
      valid: false, 
      errors: [`Invalid status. Must be one of: ${validStatuses.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate reward points
 */
function validateRewardPoints(points) {
  if (points === undefined || points === null) {
    return { valid: true }; // Optional
  }
  
  if (typeof points !== 'number') {
    return { valid: false, errors: ['reward_points must be a number'] };
  }
  
  if (points < 0 || points > 10000) {
    return { valid: false, errors: ['reward_points must be between 0 and 10000'] };
  }
  
  return { valid: true };
}

/**
 * Validate reward type
 */
function validateRewardType(type) {
  const validTypes = ['points', 'premium_days', 'badge'];
  
  if (!type || typeof type !== 'string') {
    return { valid: false, errors: ['reward_type is required and must be a string'] };
  }
  
  if (!validTypes.includes(type)) {
    return { 
      valid: false, 
      errors: [`Invalid reward_type. Must be one of: ${validTypes.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate reward amount
 */
function validateRewardAmount(amount) {
  if (!amount || typeof amount !== 'number') {
    return { valid: false, errors: ['reward_amount is required and must be a number'] };
  }
  
  if (amount < 0 || amount > 10000) {
    return { valid: false, errors: ['reward_amount must be between 0 and 10000'] };
  }
  
  return { valid: true };
}

/**
 * Validate referral redeem data
 */
function validateReferralRedeem(data) {
  const errors = [];
  
  if (!data.referral_code) {
    errors.push('referral_code is required');
  } else {
    const codeValidation = validateReferralCode(data.referral_code);
    if (!codeValidation.valid) {
      errors.push(...codeValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate referral update data
 */
function validateReferralUpdate(data) {
  const errors = [];
  
  if (data.status) {
    const statusValidation = validateReferralStatus(data.status);
    if (!statusValidation.valid) {
      errors.push(...statusValidation.errors);
    }
  }
  
  if (data.reward_points !== undefined) {
    const pointsValidation = validateRewardPoints(data.reward_points);
    if (!pointsValidation.valid) {
      errors.push(...pointsValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate reward data
 */
function validateRewardData(data) {
  const errors = [];
  
  if (!data.reward_type) {
    errors.push('reward_type is required');
  } else {
    const typeValidation = validateRewardType(data.reward_type);
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
    }
  }
  
  if (!data.reward_amount) {
    errors.push('reward_amount is required');
  } else {
    const amountValidation = validateRewardAmount(data.reward_amount);
    if (!amountValidation.valid) {
      errors.push(...amountValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

module.exports = {
  validateReferralCode,
  validateReferralStatus,
  validateRewardPoints,
  validateRewardType,
  validateRewardAmount,
  validateReferralRedeem,
  validateReferralUpdate,
  validateRewardData,
};
