'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');
const cache = require('../../utils/cache');

const router = Router();

// GET /teams/:id
router.get('/:id', async (req, res, next) => {
  try {
    const data = await cache.getOrSet(`api:team:${req.params.id}`, () =>
      db.query(d => d.from('teams').select('*').eq('id', req.params.id).single())
    , 300);
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /teams/:id/matches
router.get('/:id/matches', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const from = (pageNum - 1) * limitNum;
    const to   = from + limitNum - 1;

    // Use getAdminClient + manual unwrap so we can capture count
    const client = db.getAdminClient();
    const { data, error, count } = await client
      .from('matches')
      .select('*', { count: 'exact' })
      .or(`home_team_id.eq.${req.params.id},away_team_id.eq.${req.params.id}`)
      .order('start_time', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`[DB] ${error.message}`);
    res.json({ status: 'ok', data: data || [], count: count || 0, page: pageNum, limit: limitNum });
  } catch (err) { next(err); }
});

module.exports = router;
