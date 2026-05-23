'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');

const router = Router();

const { requireAuth } = require('../middleware/auth');

// POST /reactions - Add a reaction to a match (Protected)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { match_id, emoji } = req.body;
    if (!match_id || !emoji) {
      return res.status(400).json({ error: 'Missing required fields: match_id, emoji' });
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

    const data = await db.query(d =>
      d.from('reactions').upsert({
        user_id: userId,
        match_id,
        emoji
      }, { onConflict: 'user_id,match_id,emoji' }).select().single()
    );

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});


// GET /reactions/match/:matchId - Get reaction counts for a match
router.get('/match/:matchId', async (req, res, next) => {
  try {
    const { matchId } = req.params;
    
    // Aggregate reaction counts directly
    const reactions = await db.query(d =>
      d.from('reactions').select('emoji')
        .eq('match_id', matchId)
    );

    const counts = reactions.reduce((acc, current) => {
      acc[current.emoji] = (acc[current.emoji] || 0) + 1;
      return acc;
    }, {});

    res.json({ data: counts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
