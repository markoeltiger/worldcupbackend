'use strict';

/**
 * Recommendation Service
 * ======================
 * AI-powered recommendation engine for personalized content.
 */

const userRepository = require('../repositories/userRepository');
const onboardingRepository = require('../repositories/onboardingRepository');
const recommendationDto = require('../dtos/recommendationDto');
const logger = require('../utils/logger');

/**
 * Get personalized recommendations for user
 */
async function getRecommendations(userId, type = 'all', limit = 10) {
  try {
    const recommendations = [];

    // Get user interests
    const user = await userRepository.findById(userId);
    if (!user) {
      return recommendationDto.errorResponse('USER_NOT_FOUND', 'User not found');
    }

    // Get onboarding data
    const onboarding = await onboardingRepository.findByUserId(userId);

    // Generate recommendations based on interests
    if (onboarding && onboarding.interests) {
      const interests = onboarding.interests;
      
      // Match recommendations based on interests
      if (interests.includes('predictions')) {
        recommendations.push({
          type: 'match',
          id: 'upcoming-predictions',
          name: 'Upcoming Predictions',
          reason: 'Based on your interest in predictions',
          confidence: 0.85,
          metadata: {
            category: 'predictions',
            priority: 'high',
          },
        });
      }

      if (interests.includes('transfers')) {
        recommendations.push({
          type: 'news',
          id: 'transfer-updates',
          name: 'Transfer Updates',
          reason: 'Based on your interest in transfers',
          confidence: 0.80,
          metadata: {
            category: 'transfers',
            priority: 'medium',
          },
        });
      }

      if (interests.includes('live_scores')) {
        recommendations.push({
          type: 'match',
          id: 'live-matches',
          name: 'Live Matches',
          reason: 'Based on your interest in live scores',
          confidence: 0.90,
          metadata: {
            category: 'live',
            priority: 'high',
          },
        });
      }

      if (interests.includes('world_cup')) {
        recommendations.push({
          type: 'content',
          id: 'world-cup-highlights',
          name: 'World Cup Highlights',
          reason: 'Based on your World Cup interest',
          confidence: 0.88,
          metadata: {
            category: 'world_cup',
            priority: 'high',
          },
        });
      }
    }

    // Add recommendations based on favorite teams
    if (user.favorite_teams && user.favorite_teams.length > 0) {
      recommendations.push({
        type: 'match',
        id: 'team-matches',
        name: `${user.favorite_teams[0]} Upcoming Matches`,
        reason: 'Based on your favorite team',
        confidence: 0.92,
        metadata: {
          category: 'team',
          priority: 'high',
        },
      });
    }

    // Add recommendations based on favorite competitions
    if (onboarding && onboarding.favorite_competitions && onboarding.favorite_competitions.length > 0) {
      recommendations.push({
        type: 'competition',
        id: 'competition-news',
        name: `${onboarding.favorite_competitions[0]} News`,
        reason: 'Based on your favorite competition',
        confidence: 0.85,
        metadata: {
          category: 'competition',
          priority: 'medium',
        },
      });
    }

    // Add default recommendations if none generated
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'onboarding',
        id: 'complete-profile',
        name: 'Complete Your Profile',
        reason: 'Get personalized recommendations by completing your profile',
        confidence: 1.0,
        metadata: {
          category: 'onboarding',
          priority: 'high',
        },
      });
    }

    // Filter by type if specified
    let filteredRecommendations = recommendations;
    if (type !== 'all') {
      filteredRecommendations = recommendations.filter(r => r.type === type);
    }

    // Sort by confidence and limit
    filteredRecommendations.sort((a, b) => b.confidence - a.confidence);
    filteredRecommendations = filteredRecommendations.slice(0, limit);

    return {
      success: true,
      data: recommendationDto.toRecommendationsDTOs(filteredRecommendations),
    };
  } catch (error) {
    logger.error(`[RecommendationService] Error getting recommendations: ${error.message}`);
    throw error;
  }
}

/**
 * Get match recommendations
 */
async function getMatchRecommendations(userId, limit = 5) {
  try {
    const result = await getRecommendations(userId, 'match', limit);
    return result;
  } catch (error) {
    logger.error(`[RecommendationService] Error getting match recommendations: ${error.message}`);
    throw error;
  }
}

/**
 * Get news recommendations
 */
async function getNewsRecommendations(userId, limit = 5) {
  try {
    const result = await getRecommendations(userId, 'news', limit);
    return result;
  } catch (error) {
    logger.error(`[RecommendationService] Error getting news recommendations: ${error.message}`);
    throw error;
  }
}

/**
 * Get content recommendations
 */
async function getContentRecommendations(userId, limit = 5) {
  try {
    const result = await getRecommendations(userId, 'content', limit);
    return result;
  } catch (error) {
    logger.error(`[RecommendationService] Error getting content recommendations: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getRecommendations,
  getMatchRecommendations,
  getNewsRecommendations,
  getContentRecommendations,
};
