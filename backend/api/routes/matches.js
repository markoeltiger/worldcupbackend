'use strict';

/**
 * api/routes/matches.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mobile-safe match endpoints.
 *
 * RULES:
 * - Uses supabase admin client (NO WebSocket, NO Realtime)
 * - Returns real data only — no mocks, no fake fallbacks
 * - Returns structured error on empty/no data (never crashes)
 * - All responses include consistent shape: { data, count, ... }
 */

const { Router } = require('express');
const db    = require('../../db/supabase');  // → supabaseAdmin (REST only)
const cache = require('../../utils/cache');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /matches/live
// Returns all currently live matches from the live_match_state cache table.
// State shape: { id, home_team, away_team, home_score, away_score, minute, status, league, last_event }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/live', async (req, res, next) => {
  try {
    const rows = await cache.getOrSet('api:matches:live', async () => {
      return db.query(d =>
        d.from('live_match_state')
          .select('state, updated_at')
          .order('updated_at', { ascending: false })
      );
    }, 10); // 10s cache TTL — matches live polling interval

    if (!rows || rows.length === 0) {
      return res.json({
        status: 'ok',
        data:   [],
        count:  0,
        message: 'No live matches at this time',
      });
    }

    // Extract compact shape from state JSON
    const data = rows.map(row => {
      const s = row.state || {};
      return {
        id:         s.external_id || s.id,
        home_team:  s.home_team,
        away_team:  s.away_team,
        home_score: s.home_score ?? 0,
        away_score: s.away_score ?? 0,
        minute:     s.minute ?? 0,
        status:     s.status,
        league:     s.league,
        last_event: Array.isArray(s.events) && s.events.length > 0
          ? s.events[s.events.length - 1]
          : null,
        updated_at: row.updated_at,
      };
    });

    res.json({ status: 'ok', data, count: data.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /matches?league_id=&status=&date=&page=&limit=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { league_id, status, date, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const from = (pageNum - 1) * limitNum;
    const to   = from + limitNum - 1;

    const data = await cache.getOrSet(
      `api:matches:${league_id || ''}:${status || ''}:${date || ''}:${pageNum}:${limitNum}`,
      async () => {
        const client = db.getAdminClient();
        let q = client
          .from('matches')
          .select('*', { count: 'exact' })
          .order('start_time', { ascending: false })
          .range(from, to);

        if (league_id) q = q.eq('league_id', league_id);
        if (status)    q = q.eq('status', status);
        if (date)      q = q.gte('start_time', `${date}T00:00:00`).lte('start_time', `${date}T23:59:59`);

        const { data: rows, error, count } = await q;
        if (error) throw new Error(`[DB] ${error.message}`);
        return { rows: rows || [], count: count || 0 };
      },
      30 // 30s cache
    );

    res.json({
      status: 'ok',
      data:   data.rows,
      count:  data.count,
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
    const data = await cache.getOrSet(`api:match:${id}`, async () => {
      const match = await db.query(d =>
        d.from('matches').select('*').eq('id', id).single()
      );
      const events = await db.query(d =>
        d.from('events').select('*').eq('match_id', id).order('minute')
      );
      return { ...match, events: events || [] };
    }, 15);

    res.json({ status: 'ok', data });
  } catch (err) {
    // Handle "not found" cleanly for Android
    if (err.code === 'PGRST116' || err.message?.includes('no rows')) {
      return res.status(404).json({ status: 'error', error: 'Match not found', code: 'NOT_FOUND' });
    }
    next(err);
  }
});

module.exports = router;
