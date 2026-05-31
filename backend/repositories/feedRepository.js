'use strict';

/**
 * Feed Repository
 * ===============
 * Database operations for social feed using Supabase.
 */

const db = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Create feed item
 */
async function createFeedItem(feedData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('social_feed')
        .insert(feedData)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[FeedRepository] Error creating feed item: ${error.message}`);
      throw error;
    }

    logger.info(`[FeedRepository] Feed item created: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error creating feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Find feed items by user ID
 */
async function findByUserId(userId, feedType = null, limit = 20) {
  try {
    let query = db.query(d =>
      d.from('social_feed')
        .select('*')
        .eq('user_id', userId)
    );

    if (feedType) {
      query = query.eq('feed_type', feedType);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

    if (error) {
      logger.error(`[FeedRepository] Error finding feed items by user: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error finding feed items by user: ${error.message}`);
    throw error;
  }
}

/**
 * Get public feed
 */
async function getPublicFeed(limit = 20, offset = 0) {
  try {
    const { data, error } = await db.query(d =>
      d.from('social_feed')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    if (error) {
      logger.error(`[FeedRepository] Error getting public feed: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error getting public feed: ${error.message}`);
    throw error;
  }
}

/**
 * Find feed item by ID
 */
async function findById(feedId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('social_feed')
        .select('*')
        .eq('id', feedId)
        .single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error(`[FeedRepository] Error finding feed item: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error finding feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Update feed item
 */
async function updateFeedItem(feedId, updateData) {
  try {
    const { data, error } = await db.query(d =>
      d.from('social_feed')
        .update(updateData)
        .eq('id', feedId)
        .select()
        .single()
    );

    if (error) {
      logger.error(`[FeedRepository] Error updating feed item: ${error.message}`);
      throw error;
    }

    logger.info(`[FeedRepository] Feed item updated: ${feedId}`);
    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error updating feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Delete feed item
 */
async function deleteFeedItem(feedId) {
  try {
    const { error } = await db.query(d =>
      d.from('social_feed')
        .delete()
        .eq('id', feedId)
    );

    if (error) {
      logger.error(`[FeedRepository] Error deleting feed item: ${error.message}`);
      throw error;
    }

    logger.info(`[FeedRepository] Feed item deleted: ${feedId}`);
    return true;
  } catch (error) {
    logger.error(`[FeedRepository] Error deleting feed item: ${error.message}`);
    throw error;
  }
}

/**
 * Create feed like
 */
async function createLike(feedId, userId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('feed_likes')
        .insert({ feed_id: feedId, user_id: userId })
        .select()
        .single()
    );

    if (error) {
      logger.error(`[FeedRepository] Error creating like: ${error.message}`);
      throw error;
    }

    // Increment likes count
    await db.query(d =>
      d.from('social_feed')
        .update({ likes_count: db.raw('likes_count + 1') })
        .eq('id', feedId)
    );

    logger.info(`[FeedRepository] Like created: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error creating like: ${error.message}`);
    throw error;
  }
}

/**
 * Delete feed like
 */
async function deleteLike(feedId, userId) {
  try {
    const { error } = await db.query(d =>
      d.from('feed_likes')
        .delete()
        .eq('feed_id', feedId)
        .eq('user_id', userId)
    );

    if (error) {
      logger.error(`[FeedRepository] Error deleting like: ${error.message}`);
      throw error;
    }

    // Decrement likes count
    await db.query(d =>
      d.from('social_feed')
        .update({ likes_count: db.raw('GREATEST(likes_count - 1, 0)') })
        .eq('id', feedId)
    );

    logger.info(`[FeedRepository] Like deleted`);
    return true;
  } catch (error) {
    logger.error(`[FeedRepository] Error deleting like: ${error.message}`);
    throw error;
  }
}

/**
 * Check if user liked feed item
 */
async function checkLike(feedId, userId) {
  try {
    const { data, error } = await db.query(d =>
      d.from('feed_likes')
        .select('*')
        .eq('feed_id', feedId)
        .eq('user_id', userId)
        .single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error(`[FeedRepository] Error checking like: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error checking like: ${error.message}`);
    throw error;
  }
}

/**
 * Create feed comment
 */
async function createComment(feedId, userId, comment, parentCommentId = null) {
  try {
    const { data, error } = await db.query(d =>
      d.from('feed_comments')
        .insert({
          feed_id: feedId,
          user_id: userId,
          comment,
          parent_comment_id: parentCommentId,
        })
        .select()
        .single()
    );

    if (error) {
      logger.error(`[FeedRepository] Error creating comment: ${error.message}`);
      throw error;
    }

    // Increment comments count
    await db.query(d =>
      d.from('social_feed')
        .update({ comments_count: db.raw('comments_count + 1') })
        .eq('id', feedId)
    );

    logger.info(`[FeedRepository] Comment created: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error creating comment: ${error.message}`);
    throw error;
  }
}

/**
 * Get comments for feed item
 */
async function getComments(feedId, limit = 20) {
  try {
    const { data, error } = await db.query(d =>
      d.from('feed_comments')
        .select('*')
        .eq('feed_id', feedId)
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    if (error) {
      logger.error(`[FeedRepository] Error getting comments: ${error.message}`);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[FeedRepository] Error getting comments: ${error.message}`);
    throw error;
  }
}

/**
 * Delete comment
 */
async function deleteComment(commentId, userId) {
  try {
    const { error } = await db.query(d =>
      d.from('feed_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId)
    );

    if (error) {
      logger.error(`[FeedRepository] Error deleting comment: ${error.message}`);
      throw error;
    }

    logger.info(`[FeedRepository] Comment deleted: ${commentId}`);
    return true;
  } catch (error) {
    logger.error(`[FeedRepository] Error deleting comment: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createFeedItem,
  findByUserId,
  getPublicFeed,
  findById,
  updateFeedItem,
  deleteFeedItem,
  createLike,
  deleteLike,
  checkLike,
  createComment,
  getComments,
  deleteComment,
};
