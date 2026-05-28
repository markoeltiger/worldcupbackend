'use strict';

/**
 * api/routes/teams.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Team endpoints using API-Football service layer.
 */

const { Router } = require('express');
const apiFootball = require('../../services/apiFootball');

const router = Router();

// GET /teams/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await apiFootball.teams.getTeamById(parseInt(id));
    
    if (!team) {
      return res.status(404).json({ status: 'error', error: 'Team not found', code: 'NOT_FOUND' });
    }
    
    res.json({ status: 'ok', data: team });
  } catch (err) { next(err); }
});

module.exports = router;
