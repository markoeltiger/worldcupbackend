'use strict';

const { Router } = require('express');
const { authenticateToken } = require('../../middleware/auth');
const db = require('../../db/supabase');
const cache = require('../../utils/cache');
const crypto = require('crypto');

const router = Router();

// Profanity filter - basic implementation
const profanityList = ['fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap'];

function filterProfanity(text) {
  let filteredText = text;
  profanityList.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  });
  return filteredText;
}

// Get user badges based on account tier and leaderboard rank
function getUserBadges(user) {
  const badges = [];
  
  // Default badge for all users
  badges.push('Voter');
  
  // Premium tier badges
  if (user.level >= 5) badges.push('Premium');
  if (user.level >= 10) badges.push('Elite');
  
  // Leaderboard badges
  if (user.points >= 1000) badges.push('Gold Predictor');
  if (user.points >= 500) badges.push('Silver Predictor');
  if (user.points >= 100) badges.push('Bronze Predictor');
  
  // Verified badge
  if (user.username && !user.is_guest) badges.push('Verified');
  
  return badges;
}

// GET /matches/{id}/comments - Get comments for a match
router.get('/:matchId/comments', async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const cacheKey = `comments:${matchId}:${limit}`;
    const comments = await cache.getOrSet(cacheKey, async () => {
      const { data, error } = await db.query(d =>
        d.from('comments')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(limit)
      );
      
      if (error) throw error;
      return data;
    }, 30); // Cache for 30 seconds

    const transformedData = comments.map(comment => ({
      id: comment.id,
      match_id: comment.match_id,
      username: comment.username,
      avatar_url: comment.avatar_url,
      comment_text: comment.comment_text,
      timestamp: new Date(comment.created_at).getTime(),
      heart_count: comment.heart_count || 0,
      respect_count: comment.respect_count || 0,
      badges: comment.badges || []
    }));

    res.json({
      status: 'success',
      data: transformedData
    });
  } catch (err) {
    next(err);
  }
});

// POST /matches/{id}/comments - Add a comment to a match
router.post('/:matchId/comments', authenticateToken, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { comment_text, avatar_url, username } = req.body;

    if (!comment_text) {
      return res.status(400).json({
        error: 'comment_text is required',
        code: 'MISSING_COMMENT_TEXT'
      });
    }

    // Filter profanity
    const filteredCommentText = filterProfanity(comment_text);

    // Get user info for badges
    const userId = req.user.user_id;
    const { data: user } = await db.query(d =>
      d.from('users').select('*').eq('id', userId).maybeSingle()
    );

    const badges = user ? getUserBadges(user) : ['Voter'];

    // Create comment
    const commentId = crypto.randomUUID();
    const { data: comment, error } = await db.query(d =>
      d.from('comments').insert({
        id: commentId,
        match_id: matchId,
        user_id: userId,
        username: username || user?.username || 'Anonymous',
        avatar_url: avatar_url || user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username || 'anonymous'}`,
        comment_text: filteredCommentText,
        heart_count: 0,
        respect_count: 0,
        badges,
      }).select().single()
    );

    if (error) {
      console.error('[Comments] Error creating comment:', error.message);
      return res.status(500).json({
        error: 'Failed to create comment',
        code: 'DATABASE_ERROR'
      });
    }

    // Evict cache
    await cache.del(`comments:${matchId}:50`);

    res.json({
      status: 'success',
      data: {
        id: comment.id,
        match_id: comment.match_id,
        username: comment.username,
        avatar_url: comment.avatar_url,
        comment_text: comment.comment_text,
        timestamp: new Date(comment.created_at).getTime(),
        heart_count: comment.heart_count,
        respect_count: comment.respect_count,
        badges: comment.badges
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
