'use strict';

const { Router } = require('express');
const predictions = require('../../services/predictionsService');
const { authenticateToken } = require('../../middleware/auth');
const db = require('../../db/supabase');
const cache = require('../../utils/cache');
const crypto = require('crypto');

const router = Router();

// POST /predictions — create a prediction (Protected)
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { match_id, user_id, predicted_home_score, predicted_away_score } = req.body;
    
    if (!match_id || predicted_home_score == null || predicted_away_score == null) {
      return res.status(400).json({ 
        error: 'Missing required fields: match_id, predicted_home_score, predicted_away_score',
        code: 'MISSING_FIELDS'
      });
    }

    // Use user_id from request body or from authenticated token
    const userId = user_id || req.user.user_id;

    // Check if match is live or finished (lock prediction)
    const match = await cache.getOrSet(`match:${match_id}`, async () => {
      const result = await db.query(d =>
        d.from('matches').select('*').eq('external_id', match_id).maybeSingle()
      );
      return result;
    }, 60);

    if (match && (match.status === 'LIVE' || match.status === 'FT' || match.status === 'HT')) {
      return res.status(409).json({
        error: 'Cannot predict on live or finished matches',
        code: 'MATCH_LOCKED'
      });
    }

    // Check if user already has a prediction for this match
    const { data: existingPrediction } = await db.query(d =>
      d.from('predictions').select('*').eq('match_id', match_id).eq('user_id', userId).maybeSingle()
    );

    if (existingPrediction) {
      return res.status(409).json({
        error: 'Prediction already exists for this match',
        code: 'PREDICTION_EXISTS'
      });
    }

    // Create prediction
    const predictionId = crypto.randomUUID();
    const { data: prediction, error } = await db.query(d =>
      d.from('predictions').insert({
        id: predictionId,
        match_id,
        user_id: userId,
        predicted_home_score: parseInt(predicted_home_score, 10),
        predicted_away_score: parseInt(predicted_away_score, 10),
        status: 'pending',
        points_earned: 0,
      }).select().single()
    );

    if (error) {
      console.error('[Predictions] Error creating prediction:', error.message);
      return res.status(500).json({
        error: 'Failed to create prediction',
        code: 'DATABASE_ERROR'
      });
    }

    res.json({
      prediction_id: prediction.id,
      status: prediction.status,
      points_earned: prediction.points_earned
    });
  } catch (err) {
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
