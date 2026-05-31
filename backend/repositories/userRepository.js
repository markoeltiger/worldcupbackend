'use strict';

/**
 * User Repository
 * ================
 * Database operations for user data.
 * Handles CRUD operations for users, preferences, follows, and audit logs.
 */

const { supabaseAdmin } = require('../utils/supabase');
const logger = require('../utils/logger');

/**
 * Find user by Firebase UID
 */
async function findByFirebaseUid(firebaseUid) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error finding user by Firebase UID: ${error.message}`);
    throw error;
  }
}

/**
 * Find user by ID
 */
async function findById(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error finding user by ID: ${error.message}`);
    throw error;
  }
}

/**
 * Find user by email
 */
async function findByEmail(email) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error finding user by email: ${error.message}`);
    throw error;
  }
}

/**
 * Find user by username
 */
async function findByUsername(username) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error finding user by username: ${error.message}`);
    throw error;
  }
}

/**
 * Create user
 */
async function create(userData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User created: ${data.id}`);
    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error creating user: ${error.message}`);
    throw error;
  }
}

/**
 * Update user
 */
async function update(userId, updateData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User updated: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error updating user: ${error.message}`);
    throw error;
  }
}

/**
 * Delete user
 */
async function deleteUser(userId) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User deleted: ${userId}`);
    return true;
  } catch (error) {
    logger.error(`[UserRepository] Error deleting user: ${error.message}`);
    throw error;
  }
}

/**
 * Get user preferences
 */
async function getPreferences(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences exist, return defaults
        return createDefaultPreferences(userId);
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error getting user preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Create default preferences
 */
async function createDefaultPreferences(userId) {
  try {
    const defaultPreferences = {
      user_id: userId,
      notifications_enabled: true,
      match_notifications: true,
      goal_notifications: true,
      favorite_team_notifications: true,
      world_cup_notifications: true,
      prediction_notifications: true,
      marketing_notifications: false,
      push_notifications: true,
      email_notifications: false,
      dark_mode: false,
      language: 'en',
      timezone: 'UTC',
    };

    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .insert(defaultPreferences)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error creating default preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Update user preferences
 */
async function updatePreferences(userId, updateData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User preferences updated: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error updating user preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Get user followers
 */
async function getFollowers(userId, page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    const { data, error } = await supabaseAdmin
      .from('user_follows')
      .select(`
        follower_id,
        created_at,
        users!user_follows_follower_id_fkey (
          id,
          username,
          display_name,
          photo_url,
          prediction_points,
          prediction_rank
        )
      `)
      .eq('following_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error getting followers: ${error.message}`);
    throw error;
  }
}

/**
 * Get user following
 */
async function getFollowing(userId, page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    const { data, error } = await supabaseAdmin
      .from('user_follows')
      .select(`
        following_id,
        created_at,
        users!user_follows_following_id_fkey (
          id,
          username,
          display_name,
          photo_url,
          prediction_points,
          prediction_rank
        )
      `)
      .eq('follower_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error getting following: ${error.message}`);
    throw error;
  }
}

/**
 * Follow user
 */
async function followUser(followerId, followingId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User ${followerId} followed ${followingId}`);
    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error following user: ${error.message}`);
    throw error;
  }
}

/**
 * Unfollow user
 */
async function unfollowUser(followerId, followingId) {
  try {
    const { error } = await supabaseAdmin
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User ${followerId} unfollowed ${followingId}`);
    return true;
  } catch (error) {
    logger.error(`[UserRepository] Error unfollowing user: ${error.message}`);
    throw error;
  }
}

/**
 * Create audit log entry
 */
async function createAuditLog(auditData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_audit_log')
      .insert(auditData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error creating audit log: ${error.message}`);
    throw error;
  }
}

/**
 * Get user audit logs
 */
async function getAuditLogs(userId, page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    const { data, error } = await supabaseAdmin
      .from('user_audit_log')
      .select('*')
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error getting audit logs: ${error.message}`);
    throw error;
  }
}

/**
 * Update user statistics
 */
async function updateStatistics(userId, statistics) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(statistics)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User statistics updated: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error updating user statistics: ${error.message}`);
    throw error;
  }
}

/**
 * Get leaderboard
 */
async function getLeaderboard(page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, photo_url, prediction_points, prediction_rank')
      .not('is_guest', 'eq', true)
      .order('prediction_points', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error getting leaderboard: ${error.message}`);
    throw error;
  }
}

/**
 * Update user premium status
 */
async function updatePremiumStatus(userId, isPremium, revenuecatCustomerId = null) {
  try {
    const updateData = {
      is_premium: isPremium,
    };

    if (revenuecatCustomerId) {
      updateData.revenuecat_customer_id = revenuecatCustomerId;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User premium status updated: ${userId}, isPremium: ${isPremium}`);
    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error updating premium status: ${error.message}`);
    throw error;
  }
}

/**
 * Search users
 */
async function searchUsers(query, page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, photo_url, prediction_points, prediction_rank, public_profile')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq('public_profile', true)
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error searching users: ${error.message}`);
    throw error;
  }
}

/**
 * Update last seen timestamp
 */
async function updateLastSeen(userId) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    logger.error(`[UserRepository] Error updating last seen: ${error.message}`);
    throw error;
  }
}

/**
 * Get user interests
 */
async function getInterests(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('favorite_countries, favorite_teams, favorite_competitions, favorite_players, favorite_clubs, interests')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error getting user interests: ${error.message}`);
    throw error;
  }
}

/**
 * Update user interests
 */
async function updateInterests(userId, interestsData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(interestsData)
      .eq('id', userId)
      .select('favorite_countries, favorite_teams, favorite_competitions, favorite_players, favorite_clubs, interests')
      .single();

    if (error) {
      throw error;
    }

    logger.info(`[UserRepository] User interests updated: ${userId}`);
    return data;
  } catch (error) {
    logger.error(`[UserRepository] Error updating user interests: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findByFirebaseUid,
  findById,
  findByEmail,
  findByUsername,
  create,
  update,
  deleteUser,
  getPreferences,
  createDefaultPreferences,
  updatePreferences,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  createAuditLog,
  getAuditLogs,
  updateStatistics,
  getLeaderboard,
  updatePremiumStatus,
  searchUsers,
  updateLastSeen,
  getInterests,
  updateInterests,
};
