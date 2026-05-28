'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');
const predictionsService = require('../../services/predictionsService');
const cache = require('../../utils/cache');
const fcmService = require('../../services/fcm');

const router = Router();

// GET /users/leaderboard - Get predictions leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const type = req.query.type || 'GLOBAL';
    const limit = parseInt(req.query.limit, 10) || 50;
    
    let cacheKey = `leaderboard:${type}:${limit}`;
    let data;

    if (type === 'GLOBAL') {
      data = await cache.getOrSet(cacheKey, async () => {
        const { data: users } = await db.query(d =>
          d.from('users')
            .select('id, username, avatar_url, points, current_streak')
            .order('points', { ascending: false })
            .limit(limit)
        );

        // Calculate accuracy for each user
        const leaderboard = await Promise.all(
          users.map(async (user, index) => {
            const { data: predictions } = await db.query(d =>
              d.from('predictions')
                .select('status, points_earned')
                .eq('user_id', user.id)
            );

            const totalPredictions = predictions.length;
            const correctPredictions = predictions.filter(p => p.status === 'evaluated' && p.points_earned > 0).length;
            const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

            return {
              rank: index + 1,
              username: user.username,
              avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
              points: user.points || 0,
              streak: user.current_streak || 0,
              accuracy: parseFloat(accuracy.toFixed(1))
            };
          })
        );

        // Sort by points (desc), then streak (desc), then accuracy (desc)
        leaderboard.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.streak !== a.streak) return b.streak - a.streak;
          return b.accuracy - a.accuracy;
        });

        // Reassign ranks after sorting
        leaderboard.forEach((entry, index) => {
          entry.rank = index + 1;
        });

        return leaderboard;
      }, 60);
    } else if (type === 'COUNTRY') {
      // Country-based leaderboard (requires user to be authenticated)
      const country = req.query.country;
      if (!country) {
        return res.status(400).json({ error: 'country parameter required for COUNTRY type' });
      }

      data = await cache.getOrSet(cacheKey, async () => {
        const { data: users } = await db.query(d =>
          d.from('users')
            .select('id, username, avatar_url, points, current_streak')
            .eq('country', country)
            .order('points', { ascending: false })
            .limit(limit)
        );

        const leaderboard = await Promise.all(
          users.map(async (user, index) => {
            const { data: predictions } = await db.query(d =>
              d.from('predictions')
                .select('status, points_earned')
                .eq('user_id', user.id)
            );

            const totalPredictions = predictions.length;
            const correctPredictions = predictions.filter(p => p.status === 'evaluated' && p.points_earned > 0).length;
            const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

            return {
              rank: index + 1,
              username: user.username,
              avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
              points: user.points || 0,
              streak: user.current_streak || 0,
              accuracy: parseFloat(accuracy.toFixed(1))
            };
          })
        );

        leaderboard.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.streak !== a.streak) return b.streak - a.streak;
          return b.accuracy - a.accuracy;
        });

        leaderboard.forEach((entry, index) => {
          entry.rank = index + 1;
        });

        return leaderboard;
      }, 60);
    } else if (type === 'FRIENDS') {
      // Friends-based leaderboard (requires user_id parameter)
      const userId = req.query.user_id;
      if (!userId) {
        return res.status(400).json({ error: 'user_id parameter required for FRIENDS type' });
      }

      data = await cache.getOrSet(cacheKey, async () => {
        // Get user's friends (this would require a friends table, for now return empty)
        // For now, return just the user's own stats
        const { data: user } = await db.query(d =>
          d.from('users')
            .select('id, username, avatar_url, points, current_streak')
            .eq('id', userId)
            .single()
        );

        if (!user) {
          return [];
        }

        const { data: predictions } = await db.query(d =>
          d.from('predictions')
            .select('status, points_earned')
            .eq('user_id', user.id)
        );

        const totalPredictions = predictions.length;
        const correctPredictions = predictions.filter(p => p.status === 'evaluated' && p.points_earned > 0).length;
        const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

        return [{
          rank: 1,
          username: user.username,
          avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
          points: user.points || 0,
          streak: user.current_streak || 0,
          accuracy: parseFloat(accuracy.toFixed(1))
        }];
      }, 60);
    } else {
      return res.status(400).json({ error: 'Invalid type parameter. Must be GLOBAL, COUNTRY, or FRIENDS' });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});


// GET /users/:id - Get user profile and stats
router.get('/:id', async (req, res, next) => {
  try {
    const data = await cache.getOrSet(`user:${req.params.id}`, async () => {
      const user = await db.query(d => 
        d.from('users').select('*').eq('id', req.params.id).single()
      );
      
      const stats = await db.query(d =>
        d.from('user_stats').select('*').eq('user_id', req.params.id).maybeSingle()
      );

      return { ...user, stats: stats || null };
    }, 60);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /users - Create or update user profile
router.post('/', async (req, res, next) => {
  try {
    const { auth_id, username, display_name, avatar_url, fcm_token, favorite_teams, favorite_leagues } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const payload = {
      username,
      display_name: display_name || username,
      avatar_url,
      fcm_token,
      favorite_teams: favorite_teams || [],
      favorite_leagues: favorite_leagues || []
    };

    if (auth_id) {
      payload.auth_id = auth_id;
    }

    const data = await db.query(d =>
      d.from('users').upsert(payload, { onConflict: auth_id ? 'auth_id' : 'username' }).select().single()
    );

    // Evict cache
    await cache.del(`user:${data.id}`);

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /users/fcm-token - Register FCM token for push notifications
router.post('/fcm-token', async (req, res, next) => {
  try {
    const { user_id, firebase_token, device_info } = req.body;
    
    if (!user_id || !firebase_token) {
      return res.status(400).json({ 
        error: 'user_id and firebase_token are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Register token in database
    const result = await fcmService.registerToken(user_id, firebase_token, device_info);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error,
        code: 'TOKEN_REGISTRATION_FAILED'
      });
    }

    res.json({ 
      status: 'success',
      message: 'FCM token registered successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
