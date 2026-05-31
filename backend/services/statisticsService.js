'use strict';

/**
 * Statistics Service
 * ==================
 * Service for aggregating and managing user statistics.
 * Handles prediction statistics, leaderboard rankings, and performance metrics.
 */

const userRepository = require('../repositories/userRepository');
const logger = require('../utils/logger');

/**
 * Update prediction rank for all users
 * Recalculates prediction ranks based on prediction points
 */
async function updatePredictionRanks() {
  try {
    // Get all users ordered by prediction points
    const users = await userRepository.getLeaderboard(1, 1000);
    
    // Update ranks
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rank = i + 1;
      
      await userRepository.update(user.id, { prediction_rank: rank });
    }

    logger.info(`[StatisticsService] Updated prediction ranks for ${users.length} users`);
    return {
      success: true,
      updated_count: users.length,
    };
  } catch (error) {
    logger.error(`[StatisticsService] Error updating prediction ranks: ${error.message}`);
    throw error;
  }
}

/**
 * Get user statistics summary
 */
async function getUserStatisticsSummary(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const summary = {
      prediction_points: user.prediction_points,
      prediction_rank: user.prediction_rank,
      total_predictions: user.total_predictions,
      correct_predictions: user.correct_predictions,
      accuracy: user.total_predictions > 0 
        ? Math.round((user.correct_predictions / user.total_predictions) * 100) 
        : 0,
      followers_count: user.followers_count,
      following_count: user.following_count,
      profile_completion_score: user.profile_completion_score,
    };

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    logger.error(`[StatisticsService] Error getting user statistics summary: ${error.message}`);
    throw error;
  }
}

/**
 * Get leaderboard statistics
 */
async function getLeaderboardStatistics(page = 1, limit = 20) {
  try {
    const leaderboard = await userRepository.getLeaderboard(page, limit);
    const totalUsers = await userRepository.getLeaderboard(1, 1); // Get total count

    return {
      success: true,
      data: leaderboard,
      pagination: {
        page,
        limit,
        total: totalUsers.length,
        pages: Math.ceil(totalUsers.length / limit),
      },
    };
  } catch (error) {
    logger.error(`[StatisticsService] Error getting leaderboard statistics: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate user accuracy
 */
async function calculateUserAccuracy(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const accuracy = user.total_predictions > 0 
      ? Math.round((user.correct_predictions / user.total_predictions) * 100) 
      : 0;

    return {
      success: true,
      data: {
        user_id: userId,
        total_predictions: user.total_predictions,
        correct_predictions: user.correct_predictions,
        accuracy,
      },
    };
  } catch (error) {
    logger.error(`[StatisticsService] Error calculating user accuracy: ${error.message}`);
    throw error;
  }
}

/**
 * Get top performers
 */
async function getTopPerformers(limit = 10) {
  try {
    const leaderboard = await userRepository.getLeaderboard(1, limit);
    
    return {
      success: true,
      data: leaderboard.slice(0, limit),
    };
  } catch (error) {
    logger.error(`[StatisticsService] Error getting top performers: ${error.message}`);
    throw error;
  }
}

/**
 * Get user performance trend
 */
async function getUserPerformanceTrend(userId, days = 30) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // In a real implementation, this would query historical prediction data
    // For now, return current stats
    const trend = {
      user_id: userId,
      period_days: days,
      current_points: user.prediction_points,
      current_rank: user.prediction_rank,
      accuracy: user.total_predictions > 0 
        ? Math.round((user.correct_predictions / user.total_predictions) * 100) 
        : 0,
    };

    return {
      success: true,
      data: trend,
    };
  } catch (error) {
    logger.error(`[StatisticsService] Error getting user performance trend: ${error.message}`);
    throw error;
  }
}

/**
 * Aggregate global statistics
 */
async function aggregateGlobalStatistics() {
  try {
    // Get all users
    const allUsers = await userRepository.getLeaderboard(1, 1000);
    
    const totalUsers = allUsers.length;
    const totalPredictions = allUsers.reduce((sum, user) => sum + (user.total_predictions || 0), 0);
    const totalCorrectPredictions = allUsers.reduce((sum, user) => sum + (user.correct_predictions || 0), 0);
    const averageAccuracy = totalPredictions > 0 
      ? Math.round((totalCorrectPredictions / totalPredictions) * 100) 
      : 0;
    const totalPremiumUsers = allUsers.filter(user => user.is_premium).length;
    const totalGuestUsers = allUsers.filter(user => user.is_guest).length;

    const statistics = {
      total_users: totalUsers,
      total_predictions: totalPredictions,
      total_correct_predictions: totalCorrectPredictions,
      average_accuracy: averageAccuracy,
      premium_users: totalPremiumUsers,
      guest_users: totalGuestUsers,
      regular_users: totalUsers - totalPremiumUsers - totalGuestUsers,
    };

    return {
      success: true,
      data: statistics,
    };
  } catch (error) {
    logger.error(`[StatisticsService] Error aggregating global statistics: ${error.message}`);
    throw error;
  }
}

module.exports = {
  updatePredictionRanks,
  getUserStatisticsSummary,
  getLeaderboardStatistics,
  calculateUserAccuracy,
  getTopPerformers,
  getUserPerformanceTrend,
  aggregateGlobalStatistics,
};
