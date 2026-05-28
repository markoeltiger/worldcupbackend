'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');
const { authenticateToken } = require('../../middleware/auth');
const cache = require('../../utils/cache');
const crypto = require('crypto');

const router = Router();

// POST /reactions - Add a reaction to a comment (Protected)
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { match_id, comment_id, emoji } = req.body;
    
    if (!match_id || !comment_id || !emoji) {
      return res.status(400).json({ 
        error: 'Missing required fields: match_id, comment_id, emoji',
        code: 'MISSING_FIELDS'
      });
    }

    const userId = req.user.user_id;

    // Check if reaction already exists
    const { data: existingReaction } = await db.query(d =>
      d.from('reactions')
        .select('*')
        .eq('comment_id', comment_id)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle()
    );

    if (existingReaction) {
      // Remove existing reaction (toggle behavior)
      await db.query(d =>
        d.from('reactions')
          .delete()
          .eq('comment_id', comment_id)
          .eq('user_id', userId)
          .eq('emoji', emoji)
      );
    } else {
      // Add new reaction
      const reactionId = crypto.randomUUID();
      const { error } = await db.query(d =>
        d.from('reactions').insert({
          id: reactionId,
          match_id,
          comment_id,
          user_id: userId,
          emoji,
        })
      );

      if (error) {
        console.error('[Reactions] Error creating reaction:', error.message);
        return res.status(500).json({
          error: 'Failed to create reaction',
          code: 'DATABASE_ERROR'
        });
      }
    }

    // Get current reaction count for this comment
    const { data: reactions, error: countError } = await db.query(d =>
      d.from('reactions')
        .select('id')
        .eq('comment_id', comment_id)
    );

    if (countError) {
      console.error('[Reactions] Error counting reactions:', countError.message);
      return res.status(500).json({
        error: 'Failed to count reactions',
        code: 'DATABASE_ERROR'
      });
    }

    const currentCount = reactions.length;

    // Evict cache
    await cache.del(`comments:${match_id}:50`);

    res.json({
      success: true,
      current_count: currentCount
    });
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
