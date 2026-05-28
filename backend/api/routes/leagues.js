'use strict';

/**
 * api/routes/leagues.js
 * ─────────────────────────────────────────────────────────────────────────────
 * League endpoints using API-Football service layer.
 */

const { Router } = require('express');
const apiFootball = require('../../services/apiFootball');

const router = Router();

// GET /leagues
router.get('/', async (req, res, next) => {
  try {
    const leagues = await apiFootball.leagues.getAllLeagues();
    res.json({ status: 'ok', data: leagues, count: leagues.length });
  } catch (err) { next(err); }
});

// GET /leagues/:id/standings
router.get('/:id/standings', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { season } = req.query;
    
    // Default to current season if not provided
    const currentSeason = season || new Date().getFullYear();
    
    const standings = await apiFootball.standings.getStandings(parseInt(id), parseInt(currentSeason));
    res.json({ status: 'ok', data: standings, count: standings.length });
  } catch (err) { next(err); }
});

module.exports = router;
