'use strict';

const { getClient } = require('../../db/supabase');
const logger = require('../../utils/logger');

/**
 * Supabase Auth JWT Verification Middleware
 * Extracts the JWT bearer token, validates it against Supabase Auth,
 * fetches the corresponding user from the application's users table,
 * and attaches it to req.user.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  const supabase = getClient();

  try {
    // 1. Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    // 2. Fetch corresponding app user profile from DB
    const { data: profile, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (dbError) {
      logger.error(`[Auth Middleware] DB lookup failed: ${dbError.message}`);
      return res.status(500).json({ error: 'Internal server error during user validation' });
    }

    if (!profile) {
      // User is authenticated in Supabase Auth, but their app profile record does not exist yet.
      // We attach the Supabase Auth user detail so the route or a post-registration step can auto-create the profile.
      req.user = {
        id: null,
        auth_id: user.id,
        email: user.email,
        username: user.user_metadata?.username || user.email.split('@')[0],
        display_name: user.user_metadata?.display_name || user.user_metadata?.username
      };
    } else {
      req.user = profile;
    }

    next();
  } catch (err) {
    logger.error(`[Auth Middleware] Unhandled verification error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Internal validation failure' });
  }
}

module.exports = { requireAuth };
