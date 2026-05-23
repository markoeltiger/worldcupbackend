'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');
const predictionsService = require('../../services/predictionsService');
const cache = require('../../utils/cache');

const router = Router();

const MOCK_LEADERBOARD = [
  { id: 'usr-1', username: 'soccer_guru', display_name: 'Soccer Guru', total_points: 120, total_predictions: 15, accuracy_pct: 66.67 },
  { id: 'usr-2', username: 'predict_master', display_name: 'Prediction Master', total_points: 95, total_predictions: 15, accuracy_pct: 60.00 },
  { id: 'usr-3', username: 'alex_striker', display_name: 'Alex Striker', total_points: 85, total_predictions: 15, accuracy_pct: 53.33 }
];

// GET /users/leaderboard - Get predictions leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const data = await cache.getOrSet(`leaderboard:${limit}`, () => 
      predictionsService.getLeaderboard(limit)
    , 60); // Cache leaderboard for 1 minute
    res.json({ data });
  } catch (err) {
    res.json({ data: MOCK_LEADERBOARD });
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

module.exports = router;
