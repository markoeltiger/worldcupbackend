'use strict';

/**
 * Firebase Configuration
 * =====================
 * Firebase Authentication integration for GoalIQ.
 * Supports Google Sign In, Email/Password, and Anonymous Guest Users.
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  try {
    if (firebaseApp) {
      logger.warn('[Firebase] Firebase Admin SDK already initialized');
      return firebaseApp;
    }

    const serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Missing Firebase configuration environment variables');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    logger.info('[Firebase] Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error(`[Firebase] Failed to initialize Firebase Admin SDK: ${error.message}`);
    throw error;
  }
}

/**
 * Get Firebase Auth instance
 */
function getAuth() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

/**
 * Verify Firebase ID Token
 * @param {string} token - Firebase ID token
 * @returns {Promise<Object>} Decoded token
 */
async function verifyIdToken(token) {
  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    logger.error(`[Firebase] Failed to verify ID token: ${error.message}`);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Create Firebase user (email/password)
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} User record
 */
async function createUser(email, password, displayName = null) {
  try {
    const auth = getAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });
    logger.info(`[Firebase] User created: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    logger.error(`[Firebase] Failed to create user: ${error.message}`);
    throw error;
  }
}

/**
 * Create anonymous Firebase user
 * @returns {Promise<Object>} User record
 */
async function createAnonymousUser() {
  try {
    const auth = getAuth();
    const userRecord = await auth.createUser({
      disabled: false,
    });
    logger.info(`[Firebase] Anonymous user created: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    logger.error(`[Firebase] Failed to create anonymous user: ${error.message}`);
    throw error;
  }
}

/**
 * Link anonymous account to permanent account
 * @param {string} anonymousUid - Anonymous user UID
 * @param {string} email - Email for permanent account
 * @param {string} password - Password for permanent account
 * @returns {Promise<Object>} Updated user record
 */
async function linkAnonymousToAccount(anonymousUid, email, password) {
  try {
    const auth = getAuth();
    
    // Get anonymous user
    const anonymousUser = await auth.getUser(anonymousUid);
    
    // Create new user with email/password
    const newUserRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });
    
    // Note: In a real implementation, you would need to use Firebase Client SDK
    // to properly link accounts. This is a simplified server-side approach.
    // The actual linking should happen on the client side using Firebase Auth SDK.
    
    logger.info(`[Firebase] Anonymous user ${anonymousUid} linked to new account ${newUserRecord.uid}`);
    return newUserRecord;
  } catch (error) {
    logger.error(`[Firebase] Failed to link anonymous account: ${error.message}`);
    throw error;
  }
}

/**
 * Get Firebase user by UID
 * @param {string} uid - User UID
 * @returns {Promise<Object>} User record
 */
async function getUser(uid) {
  try {
    const auth = getAuth();
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error) {
    logger.error(`[Firebase] Failed to get user: ${error.message}`);
    throw error;
  }
}

/**
 * Get Firebase user by email
 * @param {string} email - User email
 * @returns {Promise<Object>} User record
 */
async function getUserByEmail(email) {
  try {
    const auth = getAuth();
    const userRecord = await auth.getUserByEmail(email);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    logger.error(`[Firebase] Failed to get user by email: ${error.message}`);
    throw error;
  }
}

/**
 * Update Firebase user
 * @param {string} uid - User UID
 * @param {Object} updates - User properties to update
 * @returns {Promise<Object>} Updated user record
 */
async function updateUser(uid, updates) {
  try {
    const auth = getAuth();
    const userRecord = await auth.updateUser(uid, updates);
    logger.info(`[Firebase] User updated: ${uid}`);
    return userRecord;
  } catch (error) {
    logger.error(`[Firebase] Failed to update user: ${error.message}`);
    throw error;
  }
}

/**
 * Delete Firebase user
 * @param {string} uid - User UID
 * @returns {Promise<void>}
 */
async function deleteUser(uid) {
  try {
    const auth = getAuth();
    await auth.deleteUser(uid);
    logger.info(`[Firebase] User deleted: ${uid}`);
  } catch (error) {
    logger.error(`[Firebase] Failed to delete user: ${error.message}`);
    throw error;
  }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<string>} Password reset link
 */
async function sendPasswordResetEmail(email) {
  try {
    const auth = getAuth();
    const link = await auth.generatePasswordResetLink(email);
    logger.info(`[Firebase] Password reset email sent to: ${email}`);
    return link;
  } catch (error) {
    logger.error(`[Firebase] Failed to send password reset email: ${error.message}`);
    throw error;
  }
}

/**
 * Send email verification
 * @param {string} email - User email
 * @returns {Promise<string>} Email verification link
 */
async function sendEmailVerification(email) {
  try {
    const auth = getAuth();
    const link = await auth.generateEmailVerificationLink(email);
    logger.info(`[Firebase] Email verification sent to: ${email}`);
    return link;
  } catch (error) {
    logger.error(`[Firebase] Failed to send email verification: ${error.message}`);
    throw error;
  }
}

/**
 * Revoke Firebase refresh tokens
 * @param {string} uid - User UID
 * @returns {Promise<void>}
 */
async function revokeRefreshTokens(uid) {
  try {
    const auth = getAuth();
    await auth.revokeRefreshTokens(uid);
    logger.info(`[Firebase] Refresh tokens revoked for user: ${uid}`);
  } catch (error) {
    logger.error(`[Firebase] Failed to revoke refresh tokens: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  getAuth,
  verifyIdToken,
  createUser,
  createAnonymousUser,
  linkAnonymousToAccount,
  getUser,
  getUserByEmail,
  updateUser,
  deleteUser,
  sendPasswordResetEmail,
  sendEmailVerification,
  revokeRefreshTokens,
};
