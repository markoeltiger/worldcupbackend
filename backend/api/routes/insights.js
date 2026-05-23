'use strict';

const { Router } = require('express');
const insightsService = require('../../ai/insightsService');

const router = Router();

// GET /insights/:matchId - Get AI insights/commentary for a match
router.get('/:matchId', async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { type } = req.query; // pre_match, live, post_match
    
    const data = await insightsService.getInsightsForMatch(matchId, type);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
