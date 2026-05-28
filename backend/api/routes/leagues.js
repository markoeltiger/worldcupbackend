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
    
    // Transform to match Android client schema (simplified)
    const transformedData = leagues.map(league => ({
      league: {
        id: league.league.id,
        name: league.league.name,
        logo: league.league.logo
      },
      country: {
        name: league.country.name,
        code: league.country.code,
        flag: league.country.flag
      }
    }));

    res.json({ status: 'success', data: transformedData });
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
    
    // Transform to match Android client schema (standings as array of arrays)
    const transformedData = standings.map(league => ({
      league: {
        id: league.league.id,
        name: league.league.name
      },
      standings: league.standings // API-Football already returns standings as array of arrays
    }));

    res.json({ status: 'success', data: transformedData });
  } catch (err) { next(err); }
});

module.exports = router;
