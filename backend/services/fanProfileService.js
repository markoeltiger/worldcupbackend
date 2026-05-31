'use strict';

/**
 * Fan Profile Service
 * ===================
 * Business logic for World Cup fan profile.
 */

const fanProfileRepository = require('../repositories/fanProfileRepository');
const fanProfileDto = require('../dtos/fanProfileDto');
const fanProfileValidator = require('../validators/fanProfileValidator');
const logger = require('../utils/logger');

/**
 * Get user fan profile
 */
async function getUserFanProfile(userId) {
  try {
    const fanProfile = await fanProfileRepository.findByUserId(userId);
    
    if (!fanProfile) {
      return {
        success: true,
        data: {
          favorite_player: null,
          favorite_legend: null,
          fan_since: null,
          world_cups_watched: 0,
          favorite_world_cup_moment: null,
        },
      };
    }

    return {
      success: true,
      data: fanProfileDto.toFanProfileDTO(fanProfile),
    };
  } catch (error) {
    logger.error(`[FanProfileService] Error getting user fan profile: ${error.message}`);
    throw error;
  }
}

/**
 * Update fan profile
 */
async function updateFanProfile(userId, profileData, ipAddress = null, userAgent = null) {
  try {
    // Validate fan profile data
    const validation = fanProfileValidator.validateFanProfile(profileData);
    if (!validation.valid) {
      return fanProfileDto.errorResponse('VALIDATION_ERROR', 'Invalid fan profile data', validation.errors);
    }

    // Convert to profile data
    const data = fanProfileDto.toFanProfileData(profileData);

    // Upsert fan profile
    const fanProfile = await fanProfileRepository.upsert(userId, data);

    logger.info(`[FanProfileService] Fan profile updated for user: ${userId}`);
    return fanProfileDto.successResponse(
      fanProfileDto.toFanProfileDTO(fanProfile),
      'Fan profile updated successfully'
    );
  } catch (error) {
    logger.error(`[FanProfileService] Error updating fan profile: ${error.message}`);
    throw error;
  }
}

/**
 * Delete fan profile
 */
async function deleteFanProfile(userId, ipAddress = null, userAgent = null) {
  try {
    await fanProfileRepository.deleteByUserId(userId);
    
    logger.info(`[FanProfileService] Fan profile deleted for user: ${userId}`);
    return {
      success: true,
      message: 'Fan profile deleted successfully',
    };
  } catch (error) {
    logger.error(`[FanProfileService] Error deleting fan profile: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getUserFanProfile,
  updateFanProfile,
  deleteFanProfile,
};
