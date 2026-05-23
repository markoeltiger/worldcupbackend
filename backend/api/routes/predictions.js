'use strict';

const { Router } = require('express');
const predictions = require('../../services/predictionsService');

const router = Router();

const { requireAuth } = require('../middleware/auth');
const db = require('../../db/supabase');

// POST /predictions — create a prediction (Protected)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { match_id, predicted_home, predicted_away } = req.body;
    if (!match_id || predicted_home == null || predicted_away == null) {
      return res.status(400).json({ error: 'Missing required fields: match_id, predicted_home, predicted_away' });
    }

    let userId = req.user.id;
    
    // Auto-create user profile if authenticated but database profile is missing
    if (!userId) {
      const profile = await db.query(d =>
        d.from('users').insert({
          auth_id: req.user.auth_id,
          username: req.user.username,
          display_name: req.user.display_name
        }).select().single()
      );
      userId = profile.id;
    }

    const data = await predictions.createPrediction(userId, match_id, parseInt(predicted_home, 10), parseInt(predicted_away, 10));
    res.status(201).json({ data });
  } catch (err) {
    if (err.message.includes('Cannot predict')) return res.status(409).json({ error: err.message });
    next(err);
  }
});


// GET /predictions?user_id=
router.get('/', async (req, res, next) => {
  try {
    const { user_id, limit = 20 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const data = await predictions.getUserPredictions(user_id, +limit);
    res.json({ data });
  } catch (err) { next(err); }
});

module.exports = router;
