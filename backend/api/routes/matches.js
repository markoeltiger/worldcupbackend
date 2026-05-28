'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');
const cache = require('../../utils/cache');

const router = Router();

// GET /matches/live — all currently live matches
router.get('/live', async (req, res, next) => {
  try {
    const data = await cache.getOrSet('api:matches:live', async () => {
      return db.query(d =>
        d.from('live_match_state').select('state').order('updated_at', { ascending: false })
      );
    }, 10);
    res.json({ data: data.map(r => r.state), count: data.length });
  } catch (err) {
    next(err);
  }
});

// GET /matches?league_id=&status=&date=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { league_id, status, date, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    let q = db.getClient().from('matches')
      .select('*', { count: 'exact' })
      .order('start_time', { ascending: false })
      .range(from, to);

    if (league_id) q = q.eq('league_id', league_id);
    if (status) q = q.eq('status', status);
    if (date) q = q.gte('start_time', `${date}T00:00:00`).lte('start_time', `${date}T23:59:59`);

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    res.json({ data, count, page: +page, limit: +limit });
  } catch (err) {
    next(err);
  }
});

// GET /matches/:id — single match with events
router.get('/:id', async (req, res, next) => {
  try {
    const data = await cache.getOrSet(`api:match:${req.params.id}`, async () => {
      const match = await db.query(d =>
        d.from('matches').select('*').eq('id', req.params.id).single()
      );
      const events = await db.query(d =>
        d.from('events').select('*').eq('match_id', req.params.id).order('minute')
      );
      return { ...match, events };
    }, 15);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
