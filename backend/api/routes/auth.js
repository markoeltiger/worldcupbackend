'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');
const { generateToken } = require('../../middleware/auth');
const crypto = require('crypto');

const router = Router();

// POST /users/auth - User authentication (signup/login)
router.post('/auth', async (req, res, next) => {
  try {
    const { username, avatar_url, favorite_team, country, is_guest } = req.body;

    if (!username) {
      return res.status(400).json({
        error: 'Username is required',
        code: 'MISSING_USERNAME'
      });
    }

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await db.query(d =>
      d.from('users').select('*').eq('username', username).maybeSingle()
    );

    if (fetchError) {
      console.error('[Auth] Error fetching user:', fetchError.message);
      return res.status(500).json({
        error: 'Failed to fetch user',
        code: 'DATABASE_ERROR'
      });
    }

    let user;
    let isNewUser = false;

    if (existingUser) {
      // User exists, return existing data
      user = existingUser;
    } else {
      // Create new user
      isNewUser = true;
      const userId = crypto.randomUUID();
      const welcomePoints = 50; // Welcome signup balance

      const { data: newUser, error: createError } = await db.query(d =>
        d.from('users').insert({
          id: userId,
          username,
          avatar_url: avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          favorite_team: favorite_team || null,
          country: country || null,
          points: welcomePoints,
          current_streak: 1,
          level: 1,
        }).select().single()
      );

      if (createError) {
        console.error('[Auth] Error creating user:', createError.message);
        return res.status(500).json({
          error: 'Failed to create user',
          code: 'DATABASE_ERROR'
        });
      }

      user = newUser;
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      status: 'success',
      token,
      user_id: user.id,
      points: user.points || 0,
      current_streak: user.current_streak || 0,
      level: user.level || 1
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
