'use strict';

/**
 * Profile Service
 * ===============
 * Profile management service for advanced user profile features.
 * Handles profile completion, personalization, and World Cup features.
 */

const userRepository = require('../repositories/userRepository');
const userDto = require('../dtos/userDto');
const logger = require('../utils/logger');

/**
 * Get profile completion score
 */
async function getProfileCompletionScore(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: {
        score: user.profile_completion_score,
        max_score: 100,
        percentage: Math.round((user.profile_completion_score / 100) * 100),
      },
    };
  } catch (error) {
    logger.error(`[ProfileService] Error getting profile completion score: ${error.message}`);
    throw error;
  }
}

/**
 * Get profile completion suggestions
 */
async function getProfileCompletionSuggestions(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const suggestions = [];

    if (!user.email) {
      suggestions.push({ field: 'email', points: 10, message: 'Add your email address' });
    }

    if (!user.display_name) {
      suggestions.push({ field: 'display_name', points: 10, message: 'Add your display name' });
    }

    if (!user.photo_url) {
      suggestions.push({ field: 'photo_url', points: 10, message: 'Add a profile photo' });
    }

    if (!user.country) {
      suggestions.push({ field: 'country', points: 10, message: 'Select your country' });
    }

    if (!user.favorite_country) {
      suggestions.push({ field: 'favorite_country', points: 5, message: 'Select your favorite country' });
    }

    if (!user.favorite_teams || user.favorite_teams.length === 0) {
      suggestions.push({ field: 'favorite_teams', points: 15, message: 'Add your favorite teams' });
    }

    if (!user.favorite_leagues || user.favorite_leagues.length === 0) {
      suggestions.push({ field: 'favorite_leagues', points: 10, message: 'Add your favorite leagues' });
    }

    if (!user.favorite_players || user.favorite_players.length === 0) {
      suggestions.push({ field: 'favorite_players', points: 10, message: 'Add your favorite players' });
    }

    if (!user.username) {
      suggestions.push({ field: 'username', points: 10, message: 'Choose a unique username' });
    }

    if (!user.bio) {
      suggestions.push({ field: 'bio', points: 10, message: 'Write a short bio' });
    }

    return {
      success: true,
      data: {
        current_score: user.profile_completion_score,
        max_score: 100,
        suggestions,
      },
    };
  } catch (error) {
    logger.error(`[ProfileService] Error getting profile completion suggestions: ${error.message}`);
    throw error;
  }
}

/**
 * Get World Cup personalization
 */
async function getWorldCupPersonalization(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const personalization = {
      favorite_country: user.favorite_country,
      favorite_teams: user.favorite_teams || [],
      favorite_players: user.favorite_players || [],
      is_premium: user.is_premium,
      language: user.language,
      timezone: user.timezone,
    };

    return {
      success: true,
      data: personalization,
    };
  } catch (error) {
    logger.error(`[ProfileService] Error getting World Cup personalization: ${error.message}`);
    throw error;
  }
}

/**
 * Update World Cup personalization
 */
async function updateWorldCupPersonalization(userId, personalizationData, ipAddress = null, userAgent = null) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updateData = {
      favorite_country: personalizationData.favorite_country,
      favorite_teams: personalizationData.favorite_teams || [],
      favorite_players: personalizationData.favorite_players || [],
    };

    if (personalizationData.language) {
      updateData.language = personalizationData.language;
    }

    if (personalizationData.timezone) {
      updateData.timezone = personalizationData.timezone;
    }

    const updatedUser = await userRepository.update(userId, updateData);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: userId,
      action: 'WORLDCUP_PERSONALIZATION_UPDATED',
      entity_type: 'user',
      entity_id: userId,
      old_values: {
        favorite_country: user.favorite_country,
        favorite_teams: user.favorite_teams,
        favorite_players: user.favorite_players,
      },
      new_values: updateData,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[ProfileService] World Cup personalization updated: ${userId}`);
    return {
      success: true,
      data: {
        favorite_country: updatedUser.favorite_country,
        favorite_teams: updatedUser.favorite_teams,
        favorite_players: updatedUser.favorite_players,
        language: updatedUser.language,
        timezone: updatedUser.timezone,
      },
    };
  } catch (error) {
    logger.error(`[ProfileService] Error updating World Cup personalization: ${error.message}`);
    throw error;
  }
}

/**
 * Get user activity summary
 */
async function getUserActivitySummary(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const summary = {
      total_predictions: user.total_predictions,
      correct_predictions: user.correct_predictions,
      accuracy: user.total_predictions > 0 
        ? Math.round((user.correct_predictions / user.total_predictions) * 100) 
        : 0,
      prediction_points: user.prediction_points,
      prediction_rank: user.prediction_rank,
      followers_count: user.followers_count,
      following_count: user.following_count,
      profile_completion_score: user.profile_completion_score,
      is_premium: user.is_premium,
      last_seen_at: user.last_seen_at,
      created_at: user.created_at,
    };

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    logger.error(`[ProfileService] Error getting user activity summary: ${error.message}`);
    throw error;
  }
}

/**
 * Get notification preferences
 */
async function getNotificationPreferences(userId) {
  try {
    const preferences = await userRepository.getPreferences(userId);
    return {
      success: true,
      data: {
        notifications_enabled: preferences.notifications_enabled,
        match_notifications: preferences.match_notifications,
        goal_notifications: preferences.goal_notifications,
        favorite_team_notifications: preferences.favorite_team_notifications,
        world_cup_notifications: preferences.world_cup_notifications,
        prediction_notifications: preferences.prediction_notifications,
        marketing_notifications: preferences.marketing_notifications,
        push_notifications: preferences.push_notifications,
        email_notifications: preferences.email_notifications,
      },
    };
  } catch (error) {
    logger.error(`[ProfileService] Error getting notification preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Update notification preferences
 */
async function updateNotificationPreferences(userId, notificationData, ipAddress = null, userAgent = null) {
  try {
    const preferences = await userRepository.getPreferences(userId);

    const updateData = {
      notifications_enabled: notificationData.notifications_enabled,
      match_notifications: notificationData.match_notifications,
      goal_notifications: notificationData.goal_notifications,
      favorite_team_notifications: notificationData.favorite_team_notifications,
      world_cup_notifications: notificationData.world_cup_notifications,
      prediction_notifications: notificationData.prediction_notifications,
      marketing_notifications: notificationData.marketing_notifications,
      push_notifications: notificationData.push_notifications,
      email_notifications: notificationData.email_notifications,
    };

    const updatedPreferences = await userRepository.updatePreferences(userId, updateData);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: userId,
      action: 'NOTIFICATION_PREFERENCES_UPDATED',
      entity_type: 'user_preferences',
      entity_id: updatedPreferences.id,
      old_values: {
        notifications_enabled: preferences.notifications_enabled,
        match_notifications: preferences.match_notifications,
        goal_notifications: preferences.goal_notifications,
        favorite_team_notifications: preferences.favorite_team_notifications,
        world_cup_notifications: preferences.world_cup_notifications,
        prediction_notifications: preferences.prediction_notifications,
        marketing_notifications: preferences.marketing_notifications,
        push_notifications: preferences.push_notifications,
        email_notifications: preferences.email_notifications,
      },
      new_values: updateData,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[ProfileService] Notification preferences updated: ${userId}`);
    return {
      success: true,
      data: {
        notifications_enabled: updatedPreferences.notifications_enabled,
        match_notifications: updatedPreferences.match_notifications,
        goal_notifications: updatedPreferences.goal_notifications,
        favorite_team_notifications: updatedPreferences.favorite_team_notifications,
        world_cup_notifications: updatedPreferences.world_cup_notifications,
        prediction_notifications: updatedPreferences.prediction_notifications,
        marketing_notifications: updatedPreferences.marketing_notifications,
        push_notifications: updatedPreferences.push_notifications,
        email_notifications: updatedPreferences.email_notifications,
      },
    };
  } catch (error) {
    logger.error(`[ProfileService] Error updating notification preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Get user audit logs
 */
async function getUserAuditLogs(userId, page = 1, limit = 20) {
  try {
    const auditLogs = await userRepository.getAuditLogs(userId, page, limit);

    return {
      success: true,
      data: auditLogs,
      pagination: {
        page,
        limit,
      },
    };
  } catch (error) {
    logger.error(`[ProfileService] Error getting user audit logs: ${error.message}`);
    throw error;
  }
}

/**
 * Delete user account
 */
async function deleteAccount(userId, ipAddress = null, userAgent = null) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete user account
    await userRepository.deleteUser(userId);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: userId,
      action: 'ACCOUNT_DELETED',
      entity_type: 'user',
      entity_id: userId,
      old_values: user,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[ProfileService] Account deleted: ${userId}`);
    return {
      success: true,
      message: 'Account deleted successfully',
    };
  } catch (error) {
    logger.error(`[ProfileService] Error deleting account: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getProfileCompletionScore,
  getProfileCompletionSuggestions,
  getWorldCupPersonalization,
  updateWorldCupPersonalization,
  getUserActivitySummary,
  getNotificationPreferences,
  updateNotificationPreferences,
  getUserAuditLogs,
  deleteAccount,
};
