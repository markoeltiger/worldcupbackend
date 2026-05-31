'use strict';

/**
 * User Routes
 * ============
 * REST API endpoints for user authentication and profile management.
 */

const { Router } = require('express');
const { requireAuth, optionalAuth } = require('../../middleware/auth');
const authService = require('../../services/authService');
const userService = require('../../services/userService');
const profileService = require('../../services/profileService');
const deviceService = require('../../services/deviceService');
const userRepository = require('../../repositories/userRepository');
const interestsDto = require('../../dtos/interestsDto');
const interestsValidator = require('../../validators/interestsValidator');
const fanProfileService = require('../../services/fanProfileService');
const recommendationService = require('../../services/recommendationService');
const feedService = require('../../services/feedService');
const feedDto = require('../../dtos/feedDto');
const feedValidator = require('../../validators/feedValidator');
const logger = require('../../utils/logger');

const router = Router();

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await userService.getCurrentUser(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/me
 * Update current user profile
 */
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await userService.updateCurrentUser(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/preferences
 * Get user preferences
 */
router.get('/preferences', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await userService.getUserPreferences(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/preferences
 * Update user preferences
 */
router.patch('/preferences', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await userService.updateUserPreferences(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/favorites
 * Get user favorites
 */
router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await userService.getUserFavorites(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/favorites
 * Update user favorites
 */
router.patch('/favorites', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await userService.updateUserFavorites(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/statistics
 * Get user statistics
 */
router.get('/statistics', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await userService.getUserStatistics(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/profile-completion
 * Get profile completion score
 */
router.get('/profile-completion', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await profileService.getProfileCompletionScore(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/profile-completion/suggestions
 * Get profile completion suggestions
 */
router.get('/profile-completion/suggestions', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await profileService.getProfileCompletionSuggestions(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/worldcup
 * Get World Cup personalization
 */
router.get('/worldcup', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await profileService.getWorldCupPersonalization(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/worldcup
 * Update World Cup personalization
 */
router.patch('/worldcup', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await profileService.updateWorldCupPersonalization(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/notifications
 * Get notification preferences
 */
router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await profileService.getNotificationPreferences(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/notifications
 * Update notification preferences
 */
router.patch('/notifications', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await profileService.updateNotificationPreferences(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/audit-logs
 * Get user audit logs
 */
router.get('/audit-logs', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await profileService.getUserAuditLogs(userId, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/guest/migrate
 * Migrate guest account to permanent account
 */
router.post('/guest/migrate', requireAuth, async (req, res, next) => {
  try {
    const { anonymous_uid, email, password, display_name, preserve_data } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    
    const result = await authService.migrateGuest(anonymous_uid, email, password, display_name, preserve_data);
    
    // Log audit entry
    await profileService.getUserAuditLogs(anonymous_uid);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/:username
 * Get public user profile by username
 */
router.get('/:username', optionalAuth, async (req, res, next) => {
  try {
    const result = await userService.getPublicProfile(req.params.username);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/:userId/follow
 * Follow a user
 */
router.post('/:userId/follow', requireAuth, async (req, res, next) => {
  try {
    const followerId = req.user.uid;
    const followingId = req.params.userId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await userService.followUser(followerId, followingId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/:userId/follow
 * Unfollow a user
 */
router.delete('/:userId/follow', requireAuth, async (req, res, next) => {
  try {
    const followerId = req.user.uid;
    const followingId = req.params.userId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await userService.unfollowUser(followerId, followingId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/:userId/followers
 * Get user followers
 */
router.get('/:userId/followers', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await userService.getUserFollowers(userId, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/:userId/following
 * Get user following
 */
router.get('/:userId/following', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await userService.getUserFollowing(userId, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/leaderboard
 * Get prediction leaderboard
 */
router.get('/leaderboard', optionalAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await userService.getLeaderboard(page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/search
 * Search users
 */
router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await userService.searchUsers(query, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/me
 * Delete user account
 */
router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await profileService.deleteAccount(userId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/devices
 * Register device
 */
router.post('/devices', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await deviceService.registerDevice(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/devices
 * Get user devices
 */
router.get('/devices', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const activeOnly = req.query.active === 'true';
    const result = await deviceService.getUserDevices(userId, activeOnly);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/devices/:deviceId
 * Update device
 */
router.patch('/devices/:deviceId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const deviceId = req.params.deviceId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await deviceService.updateDevice(userId, deviceId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/devices/:deviceId
 * Delete device
 */
router.delete('/devices/:deviceId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const deviceId = req.params.deviceId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await deviceService.deleteDevice(userId, deviceId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/devices/:deviceId/deactivate
 * Deactivate device
 */
router.post('/devices/:deviceId/deactivate', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const deviceId = req.params.deviceId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await deviceService.deactivateDevice(userId, deviceId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/devices/:deviceId/fcm-token
 * Update FCM token
 */
router.patch('/devices/:deviceId/fcm-token', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const deviceId = req.params.deviceId;
    const { fcm_token } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await deviceService.updateFCMToken(userId, deviceId, fcm_token, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/interests
 * Get user interests
 */
router.get('/interests', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const interests = await userRepository.getInterests(userId);
    
    if (!interests) {
      return res.json({
        success: true,
        data: {
          favorite_countries: [],
          favorite_teams: [],
          favorite_competitions: [],
          favorite_players: [],
          favorite_clubs: [],
          interests: [],
        },
      });
    }
    
    res.json({
      success: true,
      data: interestsDto.toInterestsDTO(interests),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/interests
 * Update user interests
 */
router.patch('/interests', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    
    // Validate interests data
    const validation = interestsValidator.validateInterestsUpdate(req.body);
    if (!validation.valid) {
      return res.json(interestsDto.errorResponse('VALIDATION_ERROR', 'Invalid interests data', validation.errors));
    }
    
    const interestsData = interestsDto.toInterestsData(req.body);
    const updatedInterests = await userRepository.updateInterests(userId, interestsData);
    
    res.json({
      success: true,
      data: interestsDto.toInterestsDTO(updatedInterests),
      message: 'Interests updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/fan-profile
 * Get World Cup fan profile
 */
router.get('/fan-profile', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const result = await fanProfileService.getUserFanProfile(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/fan-profile
 * Update World Cup fan profile
 */
router.patch('/fan-profile', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await fanProfileService.updateFanProfile(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/recommendations
 * Get personalized recommendations
 */
router.get('/recommendations', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const type = req.query.type || 'all';
    const limit = parseInt(req.query.limit) || 10;
    const result = await recommendationService.getRecommendations(userId, type, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/recommendations/matches
 * Get match recommendations
 */
router.get('/recommendations/matches', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 5;
    const result = await recommendationService.getMatchRecommendations(userId, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/recommendations/news
 * Get news recommendations
 */
router.get('/recommendations/news', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 5;
    const result = await recommendationService.getNewsRecommendations(userId, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/recommendations/content
 * Get content recommendations
 */
router.get('/recommendations/content', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 5;
    const result = await recommendationService.getContentRecommendations(userId, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/account-status
 * Get account status
 */
router.get('/account-status', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const user = await userRepository.findById(userId);
    
    if (!user) {
      return res.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        account_status: user.account_status || 'active',
        account_suspended_at: user.account_suspended_at,
        account_suspended_reason: user.account_suspended_reason,
        account_suspended_until: user.account_suspended_until,
        account_flagged_at: user.account_flagged_at,
        account_flagged_reason: user.account_flagged_reason,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/feed
 * Get user feed
 */
router.get('/feed', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const feedType = req.query.type;
    const limit = parseInt(req.query.limit) || 20;
    const result = await feedService.getUserFeed(userId, feedType, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/feed
 * Create feed item
 */
router.post('/feed', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await feedService.createFeedItem(userId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/feed/:feedId
 * Get feed item by ID
 */
router.get('/feed/:feedId', requireAuth, async (req, res, next) => {
  try {
    const feedId = req.params.feedId;
    const result = await feedService.getFeedItem(feedId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/feed/:feedId
 * Update feed item
 */
router.patch('/feed/:feedId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const feedId = req.params.feedId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await feedService.updateFeedItem(userId, feedId, req.body, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/feed/:feedId
 * Delete feed item
 */
router.delete('/feed/:feedId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const feedId = req.params.feedId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await feedService.deleteFeedItem(userId, feedId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/feed/:feedId/like
 * Like feed item
 */
router.post('/feed/:feedId/like', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const feedId = req.params.feedId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await feedService.likeFeedItem(userId, feedId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/feed/:feedId/like
 * Unlike feed item
 */
router.delete('/feed/:feedId/like', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const feedId = req.params.feedId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await feedService.unlikeFeedItem(userId, feedId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/feed/:feedId/comments
 * Comment on feed item
 */
router.post('/feed/:feedId/comments', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const feedId = req.params.feedId;
    const { comment, parent_comment_id } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await feedService.commentOnFeedItem(userId, feedId, comment, parent_comment_id, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/feed/:feedId/comments
 * Get feed item comments
 */
router.get('/feed/:feedId/comments', requireAuth, async (req, res, next) => {
  try {
    const feedId = req.params.feedId;
    const limit = parseInt(req.query.limit) || 20;
    const result = await feedService.getFeedItemComments(feedId, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/users/feed/comments/:commentId
 * Delete comment
 */
router.delete('/feed/comments/:commentId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const commentId = req.params.commentId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await feedService.deleteComment(userId, commentId, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
