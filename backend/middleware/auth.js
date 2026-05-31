'use strict';

/**
 * middleware/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication middleware for Firebase JWT validation.
 *
 * RULES:
 * - Validates Firebase ID tokens from Authorization header
 * - Verifies Firebase JWT on every authenticated request
 * - Attaches user info to request object
 */

const firebase = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Require authentication middleware
 * Verifies Firebase ID token and attaches user to request
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required'
        }
      });
    }

    // Verify Firebase ID token
    const decodedToken = await firebase.verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      isAnonymous: decodedToken.firebase?.sign_in_provider === 'anonymous',
      provider: decodedToken.firebase?.sign_in_provider,
    };

    next();
  } catch (error) {
    logger.error(`[Auth] Token verification failed: ${error.message}`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token'
      }
    });
  }
}

/**
 * Optional authentication middleware
 * Verifies Firebase ID token if present, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    // Verify Firebase ID token
    const decodedToken = await firebase.verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      isAnonymous: decodedToken.firebase?.sign_in_provider === 'anonymous',
      provider: decodedToken.firebase?.sign_in_provider,
    };

    next();
  } catch (error) {
    logger.warn(`[Auth] Optional auth verification failed: ${error.message}`);
    // Continue without user on optional auth failure
    req.user = null;
    next();
  }
}

/**
 * Check if user is guest (anonymous)
 */
function isGuest(req) {
  return req.user && req.user.isAnonymous;
}

/**
 * Check if user is premium
 */
function isPremium(req) {
  return req.user && req.user.isPremium;
}

module.exports = {
  requireAuth,
  optionalAuth,
  isGuest,
  isPremium,
};
