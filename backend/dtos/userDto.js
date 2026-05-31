'use strict';

/**
 * User DTOs (Data Transfer Objects)
 * ===============================
 * Optimized data transfer objects for user-related operations.
 * Ensures stable JSON contracts and minimal payload size.
 */

/**
 * Public user profile DTO
 * Excludes sensitive information for public viewing
 */
function toPublicProfile(user) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    photo_url: user.photo_url,
    country: user.country,
    bio: user.bio,
    prediction_points: user.prediction_points,
    prediction_rank: user.prediction_rank,
    total_predictions: user.total_predictions,
    correct_predictions: user.correct_predictions,
    followers_count: user.followers_count,
    following_count: user.following_count,
    profile_completion_score: user.profile_completion_score,
    favorite_teams: user.favorite_teams || [],
    favorite_leagues: user.favorite_leagues || [],
    is_premium: user.is_premium,
    created_at: user.created_at,
  };
}

/**
 * Private user profile DTO
 * Includes all user information for the owner
 */
function toPrivateProfile(user) {
  if (!user) return null;

  return {
    id: user.id,
    firebase_uid: user.firebase_uid,
    email: user.email,
    display_name: user.display_name,
    photo_url: user.photo_url,
    country: user.country,
    favorite_country: user.favorite_country,
    favorite_teams: user.favorite_teams || [],
    favorite_leagues: user.favorite_leagues || [],
    favorite_players: user.favorite_players || [],
    user_type: user.user_type,
    language: user.language,
    timezone: user.timezone,
    is_guest: user.is_guest,
    is_premium: user.is_premium,
    revenuecat_customer_id: user.revenuecat_customer_id,
    prediction_points: user.prediction_points,
    prediction_rank: user.prediction_rank,
    total_predictions: user.total_predictions,
    correct_predictions: user.correct_predictions,
    followers_count: user.followers_count,
    following_count: user.following_count,
    public_profile: user.public_profile,
    username: user.username,
    bio: user.bio,
    profile_completion_score: user.profile_completion_score,
    last_seen_at: user.last_seen_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * User preferences DTO
 */
function toUserPreferences(preferences) {
  if (!preferences) return null;

  return {
    notifications_enabled: preferences.notifications_enabled,
    match_notifications: preferences.match_notifications,
    goal_notifications: preferences.goal_notifications,
    favorite_team_notifications: preferences.favorite_team_notifications,
    world_cup_notifications: preferences.world_cup_notifications,
    prediction_notifications: preferences.prediction_notifications,
    marketing_notifications: preferences.marketing_notifications,
    push_notifications: preferences.push_notifications,
    email_notifications: preferences.email_notifications,
    dark_mode: preferences.dark_mode,
    language: preferences.language,
    timezone: preferences.timezone,
  };
}

/**
 * User statistics DTO
 */
function toUserStatistics(user) {
  if (!user) return null;

  return {
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
}

/**
 * User favorites DTO
 */
function toUserFavorites(user) {
  if (!user) return null;

  return {
    favorite_country: user.favorite_country,
    favorite_teams: user.favorite_teams || [],
    favorite_leagues: user.favorite_leagues || [],
    favorite_players: user.favorite_players || [],
  };
}

/**
 * User follow DTO
 */
function toUserFollow(follow) {
  if (!follow) return null;

  return {
    id: follow.id,
    follower_id: follow.follower_id,
    following_id: follow.following_id,
    created_at: follow.created_at,
  };
}

/**
 * Paginated response DTO
 */
function toPaginatedResponse(data, page, limit, total) {
  return {
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Error response DTO
 */
function toErrorResponse(code, message, details = null) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Success response DTO
 */
function toSuccessResponse(data, message = null) {
  const response = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Create user DTO from Firebase user
 */
function fromFirebaseUser(firebaseUser, additionalData = {}) {
  if (!firebaseUser) return null;

  return {
    firebase_uid: firebaseUser.uid,
    email: firebaseUser.email,
    display_name: firebaseUser.displayName,
    photo_url: firebaseUser.photoURL,
    is_guest: firebaseUser.isAnonymous || false,
    ...additionalData,
  };
}

/**
 * Update user DTO
 */
function toUpdateUserDTO(updateData) {
  const allowedFields = [
    'display_name',
    'photo_url',
    'country',
    'favorite_country',
    'favorite_teams',
    'favorite_leagues',
    'favorite_players',
    'language',
    'timezone',
    'username',
    'bio',
    'public_profile',
  ];

  const dto = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      dto[field] = updateData[field];
    }
  }

  return dto;
}

/**
 * Update preferences DTO
 */
function toUpdatePreferencesDTO(updateData) {
  const allowedFields = [
    'notifications_enabled',
    'match_notifications',
    'goal_notifications',
    'favorite_team_notifications',
    'world_cup_notifications',
    'prediction_notifications',
    'marketing_notifications',
    'push_notifications',
    'email_notifications',
    'dark_mode',
    'language',
    'timezone',
  ];

  const dto = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      dto[field] = updateData[field];
    }
  }

  return dto;
}

/**
 * Guest migration DTO
 */
function toGuestMigrationDTO(migrationData) {
  return {
    anonymous_uid: migrationData.anonymous_uid,
    email: migrationData.email,
    password: migrationData.password,
    display_name: migrationData.display_name,
    preserve_data: migrationData.preserve_data !== false, // Default true
  };
}

/**
 * RevenueCat webhook DTO
 */
function toRevenueCatWebhookDTO(webhookData) {
  return {
    event_type: webhookData.event_type,
    product_id: webhookData.product_id,
    customer_id: webhookData.customer_id,
    entitlement_id: webhookData.entitlement_id,
    expiration_date: webhookData.expiration_date,
    is_trial: webhookData.is_trial,
    is_intro_offer: webhookData.is_intro_offer,
    period_type: webhookData.period_type,
    raw_data: webhookData,
  };
}

module.exports = {
  toPublicProfile,
  toPrivateProfile,
  toUserPreferences,
  toUserStatistics,
  toUserFavorites,
  toUserFollow,
  toPaginatedResponse,
  toErrorResponse,
  toSuccessResponse,
  fromFirebaseUser,
  toUpdateUserDTO,
  toUpdatePreferencesDTO,
  toGuestMigrationDTO,
  toRevenueCatWebhookDTO,
};
