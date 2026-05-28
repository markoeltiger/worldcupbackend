'use strict';

/**
 * api/routes/matches.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mobile-safe match endpoints using API-Football service layer.
 *
 * RULES:
 * - Uses API-Football service layer for real data
 * - Uses supabase admin client (NO WebSocket, NO Realtime)
 * - Returns real data only — no mocks, no fake fallbacks
 * - Returns structured error on empty/no data (never crashes)
 * - All responses include consistent shape: { data, count, ... }
 */

const { Router } = require('express');
const db    = require('../../db/supabase');  // → supabaseAdmin (REST only)
const cache = require('../../utils/cache');
const apiFootball = require('../../services/apiFootball');
const { fromApiFootball } = require('../../normalizer');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /matches/live
// Returns all currently live matches from API-Football.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/live', async (req, res, next) => {
  try {
    const rawMatches = await apiFootball.live.getLiveMatches();
    
    if (!rawMatches || rawMatches.length === 0) {
      return res.json({
        status: 'ok',
        data:   [],
        count:  0,
        message: 'No live matches at this time',
      });
    }

    // Normalize to GoalIQ schema
    const data = rawMatches.map(fixture => {
      const normalized = fromApiFootball(fixture);
      return {
        id:         normalized.external_id,
        home_team:  normalized.home_team,
        away_team:  normalized.away_team,
        home_score: normalized.home_score,
        away_score: normalized.away_score,
        minute:     normalized.minute,
        status:     normalized.status,
        league:     normalized.league,
        venue:      normalized.venue,
        kickoff:    normalized.start_time,
        logo_home:  normalized._meta?.home_team_logo,
        logo_away:  normalized._meta?.away_team_logo,
        last_event: Array.isArray(normalized.events) && normalized.events.length > 0
          ? normalized.events[normalized.events.length - 1]
          : null,
        updated_at: normalized.updated_at,
      };
    });

    res.json({ status: 'ok', data, count: data.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /matches?league_id=&status=&date=&page=&limit=
// Returns fixtures from API-Football
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { league_id, season, date, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let rawFixtures = [];
    
    // Fetch based on parameters
    if (date) {
      rawFixtures = await apiFootball.fixtures.getFixturesByDate(date);
    } else if (league_id && season) {
      rawFixtures = await apiFootball.fixtures.getFixturesByLeague(parseInt(league_id), parseInt(season));
    } else {
      // Default to today's fixtures if no specific params
      const today = new Date().toISOString().split('T')[0];
      rawFixtures = await apiFootball.fixtures.getFixturesByDate(today);
    }

    // Apply pagination
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum;
    const paginatedFixtures = rawFixtures.slice(from, to);
    const totalCount = rawFixtures.length;

    // Normalize to GoalIQ schema
    const data = paginatedFixtures.map(fixture => {
      const normalized = fromApiFootball(fixture);
      return {
        id:         normalized.external_id,
        home_team:  normalized.home_team,
        away_team:  normalized.away_team,
        home_score: normalized.home_score,
        away_score: normalized.away_score,
        minute:     normalized.minute,
        status:     normalized.status,
        league:     normalized.league,
        venue:      normalized.venue,
        kickoff:    normalized.start_time,
        logo_home:  normalized._meta?.home_team_logo,
        logo_away:  normalized._meta?.away_team_logo,
        updated_at: normalized.updated_at,
      };
    });

    res.json({
      status: 'ok',
      data:   data,
      count:  totalCount,
      page:   pageNum,
      limit:  limitNum,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /matches/:id — single match detail with timeline events
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fixture = await apiFootball.fixtures.getFixtureById(parseInt(id));
    
    if (!fixture) {
      return res.status(404).json({ status: 'error', error: 'Match not found', code: 'NOT_FOUND' });
    }

    const normalized = fromApiFootball(fixture);
    
    const data = {
      id:         normalized.external_id,
      home_team:  normalized.home_team,
      away_team:  normalized.away_team,
      home_score: normalized.home_score,
      away_score: normalized.away_score,
      minute:     normalized.minute,
      status:     normalized.status,
      league:     normalized.league,
      venue:      normalized.venue,
      referee:    normalized.referee,
      kickoff:    normalized.start_time,
      logo_home:  normalized._meta?.home_team_logo,
      logo_away:  normalized._meta?.away_team_logo,
      league_id:  normalized._meta?.league_external_id,
      season:     normalized._meta?.season,
      country:    normalized._meta?.country,
      events:     normalized.events || [],
      updated_at: normalized.updated_at,
    };

    res.json({ status: 'ok', data });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /matches/:id/events — match timeline events
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/events', async (req, res, next) => {
  try {
    const { id } = req.params;
    const events = await apiFootball.events.getEvents(parseInt(id));
    
    if (!events || events.length === 0) {
      return res.json({ status: 'ok', data: [], count: 0 });
    }

    const data = events.map(ev => ({
      event_id:   `${ev.fixture?.id || id}:${ev.type}:${ev.time?.elapsed}:${ev.player?.id}`,
      type:       ev.type?.toLowerCase() || null,
      minute:     ev.time?.elapsed || 0,
      player:     ev.player?.name || null,
      assist:     ev.assist?.name || null,
      team_side:  ev.team?.name || null,
      detail:     ev.detail || null,
    }));

    res.json({ status: 'ok', data, count: data.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /matches/:id/statistics — match statistics
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/statistics', async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await apiFootball.statistics.getStatistics(parseInt(id));
    
    if (!stats || stats.length === 0) {
      return res.json({ status: 'ok', data: [], count: 0 });
    }

    res.json({ status: 'ok', data: stats, count: stats.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /matches/:id/lineups — match lineups
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/lineups', async (req, res, next) => {
  try {
    const { id } = req.params;
    const lineups = await apiFootball.lineups.getLineups(parseInt(id));
    
    if (!lineups || lineups.length === 0) {
      return res.json({ status: 'ok', data: [], count: 0 });
    }

    res.json({ status: 'ok', data: lineups, count: lineups.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
