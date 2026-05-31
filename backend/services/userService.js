'use strict';

/**
 * User Service
 * =============
 * Business logic for user profile management.
 * Handles user updates, preferences, favorites, and statistics.
 */

const userRepository = require('../repositories/userRepository');
const userDto = require('../dtos/userDto');
const userValidator = require('../validators/userValidator');
const logger = require('../utils/logger');

/**
 * Get current user profile
 */
async function getCurrentUser(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: userDto.toPrivateProfile(user),
    };
  } catch (error) {
    logger.error(`[UserService] Error getting current user: ${error.message}`);
    throw error;
  }
}

/**
 * Update current user profile
 */
async function updateCurrentUser(userId, updateData, ipAddress = null, userAgent = null) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate update data
    const validation = userValidator.validateUserUpdate(updateData);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: validation.errors,
        },
      };
    }

    // Check username uniqueness if updating username
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await userRepository.findByUsername(updateData.username);
      if (existingUser) {
        return {
          success: false,
          error: {
            code: 'USERNAME_TAKEN',
            message: 'Username already taken',
          },
        };
      }
    }

    // Convert to DTO
    const userData = userDto.toUpdateUserDTO(updateData);

    // Update user
    const updatedUser = await userRepository.update(userId, userData);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: userId,
      action: 'USER_UPDATED',
      entity_type: 'user',
      entity_id: userId,
      old_values: user,
      new_values: userData,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[UserService] User profile updated: ${userId}`);
    return {
      success: true,
      data: userDto.toPrivateProfile(updatedUser),
    };
  } catch (error) {
    logger.error(`[UserService] Error updating user: ${error.message}`);
    throw error;
  }
}

/**
 * Get user preferences
 */
async function getUserPreferences(userId) {
  try {
    const preferences = await userRepository.getPreferences(userId);
    return {
      success: true,
      data: userDto.toUserPreferences(preferences),
    };
  } catch (error) {
    logger.error(`[UserService] Error getting user preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Update user preferences
 */
async function updateUserPreferences(userId, updateData, ipAddress = null, userAgent = null) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate update data
    const validation = userValidator.validatePreferencesUpdate(updateData);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid preferences data',
          details: validation.errors,
        },
      };
    }

    // Convert to DTO
    const preferencesData = userDto.toUpdatePreferencesDTO(updateData);

    // Update preferences
    const updatedPreferences = await userRepository.updatePreferences(userId, preferencesData);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: userId,
      action: 'PREFERENCES_UPDATED',
      entity_type: 'user_preferences',
      entity_id: updatedPreferences.id,
      new_values: preferencesData,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[UserService] User preferences updated: ${userId}`);
    return {
      success: true,
      data: userDto.toUserPreferences(updatedPreferences),
    };
  } catch (error) {
    logger.error(`[UserService] Error updating preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Get user favorites
 */
async function getUserFavorites(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: userDto.toUserFavorites(user),
    };
  } catch (error) {
    logger.error(`[UserService] Error getting user favorites: ${error.message}`);
    throw error;
  }
}

/**
 * Update user favorites
 */
async function updateUserFavorites(userId, updateData, ipAddress = null, userAgent = null) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const favoritesData = {
      favorite_country: updateData.favorite_country,
      favorite_teams: updateData.favorite_teams || [],
      favorite_leagues: updateData.favorite_leagues || [],
      favorite_players: updateData.favorite_players || [],
    };

    // Update user
    const updatedUser = await userRepository.update(userId, favoritesData);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: userId,
      action: 'FAVORITES_UPDATED',
      entity_type: 'user',
      entity_id: userId,
      old_values: {
        favorite_country: user.favorite_country,
        favorite_teams: user.favorite_teams,
        favorite_leagues: user.favorite_leagues,
        favorite_players: user.favorite_players,
      },
      new_values: favoritesData,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[UserService] User favorites updated: ${userId}`);
    return {
      success: true,
      data: userDto.toUserFavorites(updatedUser),
    };
  } catch (error) {
    logger.error(`[UserService] Error updating favorites: ${error.message}`);
    throw error;
  }
}

/**
 * Get user statistics
 */
async function getUserStatistics(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: userDto.toUserStatistics(user),
    };
  } catch (error) {
    logger.error(`[UserService] Error getting user statistics: ${error.message}`);
    throw error;
  }
}

/**
 * Update user statistics
 */
async function updatePredictionStatistics(userId, isCorrect) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const statistics = {
      total_predictions: user.total_predictions + 1,
      correct_predictions: isCorrect ? user.correct_predictions + 1 : user.correct_predictions,
      prediction_points: isCorrect ? user.prediction_points + 10 : user.prediction_points,
    };

    const updatedUser = await userRepository.updateStatistics(userId, statistics);

    logger.info(`[UserService] User statistics updated: ${userId}, correct: ${isCorrect}`);
    return {
      success: true,
      data: userDto.toUserStatistics(updatedUser),
    };
  } catch (error) {
    logger.error(`[UserService] Error updating statistics: ${error.message}`);
    throw error;
  }
}

/**
 * Get public user profile
 */
async function getPublicProfile(username) {
  try {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
    }

    if (!user.public_profile) {
      return {
        success: false,
        error: {
          code: 'PROFILE_PRIVATE',
          message: 'This profile is private',
        },
      };
    }

    return {
      success: true,
      data: userDto.toPublicProfile(user),
    };
  } catch (error) {
    logger.error(`[UserService] Error getting public profile: ${error.message}`);
    throw error;
  }
}

/**
 * Follow user
 */
async function followUser(followerId, followingId, ipAddress = null, userAgent = null) {
  try {
    if (followerId === followingId) {
      return {
        success: false,
        error: {
          code: 'CANNOT_FOLLOW_SELF',
          message: 'You cannot follow yourself',
        },
      };
    }

    const follower = await userRepository.findById(followerId);
    const following = await userRepository.findById(followingId);

    if (!follower || !following) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
    }

    // Check if already following
    const existingFollow = await userRepository.getFollowers(followingId);
    const isAlreadyFollowing = existingFollow.some(f => f.follower_id === followerId);

    if (isAlreadyFollowing) {
      return {
        success: false,
        error: {
          code: 'ALREADY_FOLLOWING',
          message: 'Already following this user',
        },
      };
    }

    // Follow user
    await userRepository.followUser(followerId, followingId);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: followerId,
      action: 'USER_FOLLOWED',
      entity_type: 'user_follows',
      entity_id: followingId,
      new_values: { follower_id: followerId, following_id: followingId },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[UserService] User ${followerId} followed ${followingId}`);
    return {
      success: true,
      message: 'User followed successfully',
    };
  } catch (error) {
    logger.error(`[UserService] Error following user: ${error.message}`);
    throw error;
  }
}

/**
 * Unfollow user
 */
async function unfollowUser(followerId, followingId, ipAddress = null, userAgent = null) {
  try {
    const follower = await userRepository.findById(followerId);
    const following = await userRepository.findById(followingId);

    if (!follower || !following) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
    }

    // Unfollow user
    await userRepository.unfollowUser(followerId, followingId);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: followerId,
      action: 'USER_UNFOLLOWED',
      entity_type: 'user_follows',
      entity_id: followingId,
      old_values: { follower_id: followerId, following_id: followingId },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[UserService] User ${followerId} unfollowed ${followingId}`);
    return {
      success: true,
      message: 'User unfollowed successfully',
    };
  } catch (error) {
    logger.error(`[UserService] Error unfollowing user: ${error.message}`);
    throw error;
  }
}

/**
 * Get user followers
 */
async function getUserFollowers(userId, page = 1, limit = 20) {
  try {
    const validation = userValidator.validatePagination(page, limit);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          details: validation.errors,
        },
      };
    }

    const followers = await userRepository.getFollowers(userId, validation.page, validation.limit);

    return {
      success: true,
      data: followers,
      pagination: {
        page: validation.page,
        limit: validation.limit,
      },
    };
  } catch (error) {
    logger.error(`[UserService] Error getting followers: ${error.message}`);
    throw error;
  }
}

/**
 * Get user following
 */
async function getUserFollowing(userId, page = 1, limit = 20) {
  try {
    const validation = userValidator.validatePagination(page, limit);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          details: validation.errors,
        },
      };
    }

    const following = await userRepository.getFollowing(userId, validation.page, validation.limit);

    return {
      success: true,
      data: following,
      pagination: {
        page: validation.page,
        limit: validation.limit,
      },
    };
  } catch (error) {
    logger.error(`[UserService] Error getting following: ${error.message}`);
    throw error;
  }
}

/**
 * Get leaderboard
 */
async function getLeaderboard(page = 1, limit = 20) {
  try {
    const validation = userValidator.validatePagination(page, limit);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          details: validation.errors,
        },
      };
    }

    const leaderboard = await userRepository.getLeaderboard(validation.page, validation.limit);

    return {
      success: true,
      data: leaderboard,
      pagination: {
        page: validation.page,
        limit: validation.limit,
      },
    };
  } catch (error) {
    logger.error(`[UserService] Error getting leaderboard: ${error.message}`);
    throw error;
  }
}

/**
 * Search users
 */
async function searchUsers(query, page = 1, limit = 20) {
  try {
    if (!query || query.length < 2) {
      return {
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query must be at least 2 characters',
        },
      };
    }

    const validation = userValidator.validatePagination(page, limit);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          details: validation.errors,
        },
      };
    }

    const users = await userRepository.searchUsers(query, validation.page, validation.limit);

    return {
      success: true,
      data: users,
      pagination: {
        page: validation.page,
        limit: validation.limit,
      },
    };
  } catch (error) {
    logger.error(`[UserService] Error searching users: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  getUserPreferences,
  updateUserPreferences,
  getUserFavorites,
  updateUserFavorites,
  getUserStatistics,
  updatePredictionStatistics,
  getPublicProfile,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  getLeaderboard,
  searchUsers,
};
