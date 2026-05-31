'use strict';

/**
 * Feed Validators
 * ==============
 * Validation functions for social feed.
 */

const logger = require('../utils/logger');

/**
 * Validate feed type
 */
function validateFeedType(feedType) {
  const validTypes = ['prediction', 'match_comment', 'achievement', 'milestone', 'news'];
  
  if (!feedType || typeof feedType !== 'string') {
    return { valid: false, errors: ['feed_type is required and must be a string'] };
  }
  
  if (!validTypes.includes(feedType)) {
    return { 
      valid: false, 
      errors: [`Invalid feed_type. Must be one of: ${validTypes.join(', ')}`] 
    };
  }
  
  return { valid: true };
}

/**
 * Validate content
 */
function validateContent(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, errors: ['content is required and must be a string'] };
  }
  
  if (content.length > 5000) {
    return { valid: false, errors: ['content must be less than 5000 characters'] };
  }
  
  if (content.trim().length === 0) {
    return { valid: false, errors: ['content cannot be empty'] };
  }
  
  return { valid: true };
}

/**
 * Validate metadata
 */
function validateMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return { valid: true }; // Optional
  }
  
  if (typeof metadata !== 'object') {
    return { valid: false, errors: ['metadata must be an object'] };
  }
  
  return { valid: true };
}

/**
 * Validate comment
 */
function validateComment(comment) {
  if (!comment || typeof comment !== 'string') {
    return { valid: false, errors: ['comment is required and must be a string'] };
  }
  
  if (comment.length > 1000) {
    return { valid: false, errors: ['comment must be less than 1000 characters'] };
  }
  
  if (comment.trim().length === 0) {
    return { valid: false, errors: ['comment cannot be empty'] };
  }
  
  return { valid: true };
}

/**
 * Validate feed item data
 */
function validateFeedItem(data) {
  const errors = [];
  
  // Validate feed type (required)
  if (!data.feed_type) {
    errors.push('feed_type is required');
  } else {
    const typeValidation = validateFeedType(data.feed_type);
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
    }
  }
  
  // Validate content (required)
  if (!data.content) {
    errors.push('content is required');
  } else {
    const contentValidation = validateContent(data.content);
    if (!contentValidation.valid) {
      errors.push(...contentValidation.errors);
    }
  }
  
  // Validate metadata (optional)
  if (data.metadata !== undefined) {
    const metadataValidation = validateMetadata(data.metadata);
    if (!metadataValidation.valid) {
      errors.push(...metadataValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Validate feed comment data
 */
function validateFeedComment(data) {
  const errors = [];
  
  // Validate comment (required)
  if (!data.comment) {
    errors.push('comment is required');
  } else {
    const commentValidation = validateComment(data.comment);
    if (!commentValidation.valid) {
      errors.push(...commentValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

module.exports = {
  validateFeedType,
  validateContent,
  validateMetadata,
  validateComment,
  validateFeedItem,
  validateFeedComment,
};
