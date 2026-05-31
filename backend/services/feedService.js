'use strict';

/**
 * Feed Service
 * =============
 * Business logic for social feed.
 */

const feedRepository = require('../repositories/feedRepository');
const feedDto = require('../dtos/feedDto');
const feedValidator = require('../validators/feedValidator');
const logger = require('../utils/logger');

/**
 * Create feed item
 */
async function createFeedItem(userId, feedData, ipAddress = null, userAgent = null) {
  try {
    // Validate feed item data
    const validation = feedValidator.validateFeedItem(feedData);
    if (!validation.valid) {
      return feedDto.errorResponse('VALIDATION_ERROR', 'Invalid feed item data', validation.errors);
    }

    // Convert to feed item data
    const data = feedDto.toFeedItemData(feedData);
    data.user_id = userId;

    // Create feed item
    const feedItem = await feedRepository.createFeedItem(data);

    logger.info(`[FeedService] Feed item created for user: ${userId}`);
    return feedDto.successResponse(
      feedDto.toFeedItemDTO(feedItem),
      'Feed item created successfully'
    );
  } catch (error) {
    logger.error(`[FeedService] Error creating feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Get user feed
 */
async function getUserFeed(userId, feedType = null, limit = 20) {
  try {
    const feedItems = await feedRepository.findByUserId(userId, feedType, limit);

    return {
      success: true,
      data: feedDto.toFeedItemDTOs(feedItems),
    };
  } catch (error) {
    logger.error(`[FeedService] Error getting user feed: ${error.message}`);
    throw error;
  }
}

/**
 * Get public feed
 */
async function getPublicFeed(limit = 20, offset = 0) {
  try {
    const feedItems = await feedRepository.getPublicFeed(limit, offset);

    return {
      success: true,
      data: feedDto.toFeedItemDTOs(feedItems),
    };
  } catch (error) {
    logger.error(`[FeedService] Error getting public feed: ${error.message}`);
    throw error;
  }
}

/**
 * Get feed item by ID
 */
async function getFeedItem(feedId) {
  try {
    const feedItem = await feedRepository.findById(feedId);

    if (!feedItem) {
      return feedDto.errorResponse('FEED_ITEM_NOT_FOUND', 'Feed item not found');
    }

    return {
      success: true,
      data: feedDto.toFeedItemDTO(feedItem),
    };
  } catch (error) {
    logger.error(`[FeedService] Error getting feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Update feed item
 */
async function updateFeedItem(userId, feedId, updateData, ipAddress = null, userAgent = null) {
  try {
    // Check if feed item exists and belongs to user
    const feedItem = await feedRepository.findById(feedId);
    if (!feedItem) {
      return feedDto.errorResponse('FEED_ITEM_NOT_FOUND', 'Feed item not found');
    }

    if (feedItem.user_id !== userId) {
      return feedDto.errorResponse('FORBIDDEN', 'You do not have permission to update this feed item');
    }

    // Update feed item
    const updatedFeedItem = await feedRepository.updateFeedItem(feedId, updateData);

    logger.info(`[FeedService] Feed item updated: ${feedId}`);
    return feedDto.successResponse(
      feedDto.toFeedItemDTO(updatedFeedItem),
      'Feed item updated successfully'
    );
  } catch (error) {
    logger.error(`[FeedService] Error updating feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Delete feed item
 */
async function deleteFeedItem(userId, feedId, ipAddress = null, userAgent = null) {
  try {
    // Check if feed item exists and belongs to user
    const feedItem = await feedRepository.findById(feedId);
    if (!feedItem) {
      return feedDto.errorResponse('FEED_ITEM_NOT_FOUND', 'Feed item not found');
    }

    if (feedItem.user_id !== userId) {
      return feedDto.errorResponse('FORBIDDEN', 'You do not have permission to delete this feed item');
    }

    // Delete feed item
    await feedRepository.deleteFeedItem(feedId);

    logger.info(`[FeedService] Feed item deleted: ${feedId}`);
    return {
      success: true,
      message: 'Feed item deleted successfully',
    };
  } catch (error) {
    logger.error(`[FeedService] Error deleting feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Like feed item
 */
async function likeFeedItem(userId, feedId, ipAddress = null, userAgent = null) {
  try {
    // Check if already liked
    const existingLike = await feedRepository.checkLike(feedId, userId);
    if (existingLike) {
      return feedDto.errorResponse('ALREADY_LIKED', 'You have already liked this feed item');
    }

    // Create like
    await feedRepository.createLike(feedId, userId);

    logger.info(`[FeedService] Feed item liked: ${feedId} by user: ${userId}`);
    return {
      success: true,
      message: 'Feed item liked successfully',
    };
  } catch (error) {
    logger.error(`[FeedService] Error liking feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Unlike feed item
 */
async function unlikeFeedItem(userId, feedId, ipAddress = null, userAgent = null) {
  try {
    // Delete like
    await feedRepository.deleteLike(feedId, userId);

    logger.info(`[FeedService] Feed item unliked: ${feedId} by user: ${userId}`);
    return {
      success: true,
      message: 'Feed item unliked successfully',
    };
  } catch (error) {
    logger.error(`[FeedService] Error unliking feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Comment on feed item
 */
async function commentOnFeedItem(userId, feedId, comment, parentCommentId = null, ipAddress = null, userAgent = null) {
  try {
    // Validate comment
    const validation = feedValidator.validateFeedComment({ comment });
    if (!validation.valid) {
      return feedDto.errorResponse('VALIDATION_ERROR', 'Invalid comment', validation.errors);
    }

    // Create comment
    const feedComment = await feedRepository.createComment(feedId, userId, comment, parentCommentId);

    logger.info(`[FeedService] Comment created on feed item: ${feedId}`);
    return feedDto.successResponse(
      feedDto.toFeedCommentDTO(feedComment),
      'Comment created successfully'
    );
  } catch (error) {
    logger.error(`[FeedService] Error commenting on feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Get feed item comments
 */
async function getFeedItemComments(feedId, limit = 20) {
  try {
    const comments = await feedRepository.getComments(feedId, limit);

    return {
      success: true,
      data: feedDto.toFeedCommentDTOs(comments),
    };
  } catch (error) {
    logger.error(`[FeedService] Error getting feed item comments: ${error.message}`);
    throw error;
  }
}

/**
 * Delete comment
 */
async function deleteComment(userId, commentId, ipAddress = null, userAgent = null) {
  try {
    // Delete comment
    await feedRepository.deleteComment(commentId, userId);

    logger.info(`[FeedService] Comment deleted: ${commentId}`);
    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  } catch (error) {
    logger.error(`[FeedService] Error deleting comment: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createFeedItem,
  getUserFeed,
  getPublicFeed,
  getFeedItem,
  updateFeedItem,
  deleteFeedItem,
  likeFeedItem,
  unlikeFeedItem,
  commentOnFeedItem,
  getFeedItemComments,
  deleteComment,
};
