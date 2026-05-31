'use strict';

/**
 * Auth Service
 * =============
 * Authentication service for user registration, login, and session management.
 * Handles Firebase Authentication integration and user profile creation.
 */

const firebase = require('../config/firebase');
const userRepository = require('../repositories/userRepository');
const userDto = require('../dtos/userDto');
const logger = require('../utils/logger');

/**
 * Register new user
 */
async function registerUser(firebaseUser, additionalData = {}) {
  try {
    // Check if user already exists
    let user = await userRepository.findByFirebaseUid(firebaseUser.uid);

    if (user) {
      logger.info(`[AuthService] User already exists: ${firebaseUser.uid}`);
      return {
        success: true,
        user,
        isNew: false,
      };
    }

    // Create new user profile
    const userData = userDto.fromFirebaseUser(firebaseUser, additionalData);
    user = await userRepository.create(userData);

    // Create default preferences
    await userRepository.createDefaultPreferences(user.id);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: user.id,
      action: 'USER_REGISTERED',
      entity_type: 'user',
      entity_id: user.id,
      new_values: userData,
      ip_address: additionalData.ipAddress,
      user_agent: additionalData.userAgent,
    });

    logger.info(`[AuthService] New user registered: ${user.id}`);
    return {
      success: true,
      user,
      isNew: true,
    };
  } catch (error) {
    logger.error(`[AuthService] Error registering user: ${error.message}`);
    throw error;
  }
}

/**
 * Login user
 */
async function loginUser(firebaseUser, ipAddress = null, userAgent = null) {
  try {
    // Find or create user
    let user = await userRepository.findByFirebaseUid(firebaseUser.uid);

    if (!user) {
      // Auto-create user profile on first login
      const userData = userDto.fromFirebaseUser(firebaseUser);
      user = await userRepository.create(userData);
      await userRepository.createDefaultPreferences(user.id);

      // Log audit entry
      await userRepository.createAuditLog({
        user_id: user.id,
        action: 'AUTO_REGISTERED',
        entity_type: 'user',
        entity_id: user.id,
        new_values: userData,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    }

    // Update last seen
    await userRepository.updateLastSeen(user.id);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: user.id,
      action: 'USER_LOGIN',
      entity_type: 'user',
      entity_id: user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[AuthService] User logged in: ${user.id}`);
    return {
      success: true,
      user,
    };
  } catch (error) {
    logger.error(`[AuthService] Error logging in user: ${error.message}`);
    throw error;
  }
}

/**
 * Logout user
 */
async function logoutUser(userId, ipAddress = null, userAgent = null) {
  try {
    // Revoke Firebase refresh tokens
    const user = await userRepository.findById(userId);
    if (user) {
      await firebase.revokeRefreshTokens(user.firebase_uid);
    }

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: userId,
      action: 'USER_LOGOUT',
      entity_type: 'user',
      entity_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[AuthService] User logged out: ${userId}`);
    return {
      success: true,
    };
  } catch (error) {
    logger.error(`[AuthService] Error logging out user: ${error.message}`);
    throw error;
  }
}

/**
 * Create anonymous user
 */
async function createAnonymousUser() {
  try {
    // Create anonymous Firebase user
    const firebaseUser = await firebase.createAnonymousUser();

    // Create user profile
    const userData = {
      firebase_uid: firebaseUser.uid,
      is_guest: true,
      user_type: 'guest',
    };

    const user = await userRepository.create(userData);
    await userRepository.createDefaultPreferences(user.id);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: user.id,
      action: 'GUEST_CREATED',
      entity_type: 'user',
      entity_id: user.id,
      new_values: userData,
    });

    logger.info(`[AuthService] Anonymous user created: ${user.id}`);
    return {
      success: true,
      user,
      firebaseUser,
    };
  } catch (error) {
    logger.error(`[AuthService] Error creating anonymous user: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate guest to permanent account
 */
async function migrateGuest(anonymousUid, email, password, displayName = null, preserveData = true) {
  try {
    // Find anonymous user
    const anonymousUser = await userRepository.findByFirebaseUid(anonymousUid);
    if (!anonymousUser) {
      throw new Error('Anonymous user not found');
    }

    // Create Firebase user with email/password
    const firebaseUser = await firebase.createUser(email, password, displayName);

    // Update user profile
    const updateData = {
      firebase_uid: firebaseUser.uid,
      email: firebaseUser.email,
      display_name: displayName || firebaseUser.displayName,
      is_guest: false,
      user_type: 'user',
    };

    if (!preserveData) {
      // Clear guest data if not preserving
      updateData.favorite_teams = [];
      updateData.favorite_leagues = [];
      updateData.favorite_players = [];
    }

    const user = await userRepository.update(anonymousUser.id, updateData);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: user.id,
      action: 'GUEST_MIGRATED',
      entity_type: 'user',
      entity_id: user.id,
      old_values: { firebase_uid: anonymousUid, is_guest: true },
      new_values: updateData,
    });

    logger.info(`[AuthService] Guest migrated: ${anonymousUid} -> ${firebaseUser.uid}`);
    return {
      success: true,
      user,
      firebaseUser,
    };
  } catch (error) {
    logger.error(`[AuthService] Error migrating guest: ${error.message}`);
    throw error;
  }
}

/**
 * Delete user account
 */
async function deleteUserAccount(userId, ipAddress = null, userAgent = null) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete Firebase user
    await firebase.deleteUser(user.firebase_uid);

    // Delete user from database (cascade will handle related data)
    await userRepository.deleteUser(userId);

    // Log audit entry
    await userRepository.createAuditLog({
      user_id: userId,
      action: 'USER_DELETED',
      entity_type: 'user',
      entity_id: userId,
      old_values: user,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[AuthService] User account deleted: ${userId}`);
    return {
      success: true,
    };
  } catch (error) {
    logger.error(`[AuthService] Error deleting user account: ${error.message}`);
    throw error;
  }
}

/**
 * Send password reset email
 */
async function sendPasswordReset(email) {
  try {
    const resetLink = await firebase.sendPasswordResetEmail(email);
    logger.info(`[AuthService] Password reset email sent to: ${email}`);
    return {
      success: true,
      resetLink,
    };
  } catch (error) {
    logger.error(`[AuthService] Error sending password reset: ${error.message}`);
    throw error;
  }
}

/**
 * Send email verification
 */
async function sendEmailVerification(email) {
  try {
    const verificationLink = await firebase.sendEmailVerification(email);
    logger.info(`[AuthService] Email verification sent to: ${email}`);
    return {
      success: true,
      verificationLink,
    };
  } catch (error) {
    logger.error(`[AuthService] Error sending email verification: ${error.message}`);
    throw error;
  }
}

/**
 * Verify Firebase ID token
 */
async function verifyToken(token) {
  try {
    const decodedToken = await firebase.verifyIdToken(token);
    return {
      success: true,
      decodedToken,
    };
  } catch (error) {
    logger.error(`[AuthService] Error verifying token: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Refresh user session
 */
async function refreshSession(userId) {
  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update last seen
    await userRepository.updateLastSeen(userId);

    return {
      success: true,
      user,
    };
  } catch (error) {
    logger.error(`[AuthService] Error refreshing session: ${error.message}`);
    throw error;
  }
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  createAnonymousUser,
  migrateGuest,
  deleteUserAccount,
  sendPasswordReset,
  sendEmailVerification,
  verifyToken,
  refreshSession,
};
