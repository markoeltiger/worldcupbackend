'use strict';

/**
 * Feed DTOs
 * =========
 * Data transfer objects for social feed.
 */

/**
 * Convert database row to feed item DTO
 */
function toFeedItemDTO(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    user_id: row.user_id,
    feed_type: row.feed_type,
    content: row.content,
    metadata: row.metadata || {},
    related_match_id: row.related_match_id,
    related_prediction_id: row.related_prediction_id,
    likes_count: row.likes_count || 0,
    comments_count: row.comments_count || 0,
    shares_count: row.shares_count || 0,
    is_public: row.is_public,
    is_pinned: row.is_pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert database rows to feed item DTOs
 */
function toFeedItemDTOs(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(toFeedItemDTO);
}

/**
 * Convert database row to feed comment DTO
 */
function toFeedCommentDTO(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    feed_id: row.feed_id,
    user_id: row.user_id,
    comment: row.comment,
    parent_comment_id: row.parent_comment_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert database rows to feed comment DTOs
 */
function toFeedCommentDTOs(rows) {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(toFeedCommentDTO);
}

/**
 * Convert request body to feed item data
 */
function toFeedItemData(body) {
  return {
    feed_type: body.feed_type,
    content: body.content,
    metadata: body.metadata,
    related_match_id: body.related_match_id,
    related_prediction_id: body.related_prediction_id,
    is_public: body.is_public !== false,
    is_pinned: body.is_pinned || false,
  };
}

/**
 * Success response DTO
 */
function successResponse(data, message = 'Success') {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Error response DTO
 */
function errorResponse(code, message, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return response;
}

module.exports = {
  toFeedItemDTO,
  toFeedItemDTOs,
  toFeedCommentDTO,
  toFeedCommentDTOs,
  toFeedItemData,
  successResponse,
  errorResponse,
};
