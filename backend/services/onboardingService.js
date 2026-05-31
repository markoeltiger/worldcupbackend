'use strict';

/**
 * Onboarding Service
 * ==================
 * Business logic for onboarding system.
 */

const onboardingRepository = require('../repositories/onboardingRepository');
const onboardingDto = require('../dtos/onboardingDto');
const onboardingValidator = require('../validators/onboardingValidator');
const logger = require('../utils/logger');

/**
 * Get user onboarding
 */
async function getUserOnboarding(userId) {
  try {
    const onboarding = await onboardingRepository.findByUserId(userId);
    
    if (!onboarding) {
      return {
        success: true,
        data: {
          is_completed: false,
          favorite_countries: [],
          favorite_teams: [],
          favorite_competitions: [],
          interests: [],
          user_mode: 'viewer',
          experience_level: 'casual',
          notifications_enabled: true,
        },
      };
    }

    return {
      success: true,
      data: onboardingDto.toOnboardingDTO(onboarding),
    };
  } catch (error) {
    logger.error(`[OnboardingService] Error getting user onboarding: ${error.message}`);
    throw error;
  }
}

/**
 * Complete onboarding
 */
async function completeOnboarding(userId, onboardingData, ipAddress = null, userAgent = null) {
  try {
    // Validate onboarding data
    const validation = onboardingValidator.validateOnboardingCompletion(onboardingData);
    if (!validation.valid) {
      return onboardingDto.errorResponse('VALIDATION_ERROR', 'Invalid onboarding data', validation.errors);
    }

    // Convert to completion data
    const completionData = onboardingDto.toOnboardingCompletionData(onboardingData);
    completionData.user_id = userId;

    // Upsert onboarding record
    const onboarding = await onboardingRepository.upsert(userId, completionData);

    logger.info(`[OnboardingService] Onboarding completed for user: ${userId}`);
    return onboardingDto.successResponse(
      onboardingDto.toOnboardingDTO(onboarding),
      'Onboarding completed successfully'
    );
  } catch (error) {
    logger.error(`[OnboardingService] Error completing onboarding: ${error.message}`);
    throw error;
  }
}

/**
 * Update onboarding
 */
async function updateOnboarding(userId, onboardingData, ipAddress = null, userAgent = null) {
  try {
    // Validate onboarding data
    const validation = onboardingValidator.validateOnboardingUpdate(onboardingData);
    if (!validation.valid) {
      return onboardingDto.errorResponse('VALIDATION_ERROR', 'Invalid onboarding data', validation.errors);
    }

    // Convert to update data
    const updateData = onboardingDto.toOnboardingData(onboardingData);

    // Update onboarding record
    const onboarding = await onboardingRepository.update(userId, updateData);

    logger.info(`[OnboardingService] Onboarding updated for user: ${userId}`);
    return onboardingDto.successResponse(
      onboardingDto.toOnboardingDTO(onboarding),
      'Onboarding updated successfully'
    );
  } catch (error) {
    logger.error(`[OnboardingService] Error updating onboarding: ${error.message}`);
    throw error;
  }
}

/**
 * Get onboarding statistics
 */
async function getOnboardingStats() {
  try {
    const stats = await onboardingRepository.getCompletionStats();
    
    return {
      success: true,
      data: onboardingDto.toOnboardingStatsDTO(stats),
    };
  } catch (error) {
    logger.error(`[OnboardingService] Error getting onboarding stats: ${error.message}`);
    throw error;
  }
}

/**
 * Reset onboarding
 */
async function resetOnboarding(userId) {
  try {
    await onboardingRepository.deleteByUserId(userId);
    
    logger.info(`[OnboardingService] Onboarding reset for user: ${userId}`);
    return {
      success: true,
      message: 'Onboarding reset successfully',
    };
  } catch (error) {
    logger.error(`[OnboardingService] Error resetting onboarding: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getUserOnboarding,
  completeOnboarding,
  updateOnboarding,
  getOnboardingStats,
  resetOnboarding,
};
