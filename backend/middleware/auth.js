'use strict';

/**
 * middleware/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication middleware for Bearer token validation.
 *
 * RULES:
 * - Validates Bearer tokens from Authorization header
 * - Extracts user_id from token
 * - Attaches user_id to request object
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'goal-iq-secret-key-2026';

/**
 * Authentication middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      error: 'Access token is required',
      code: 'MISSING_TOKEN'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.error('[Auth] Token verification failed:', err.message);
      return res.status(403).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      user_id: user.id,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

module.exports = {
  authenticateToken,
  generateToken,
};
