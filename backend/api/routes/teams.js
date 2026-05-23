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
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    const { data, error, count } = await db.getClient()
      .from('matches').select('*', { count: 'exact' })
      .or(`home_team_id.eq.${req.params.id},away_team_id.eq.${req.params.id}`)
      .order('start_time', { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    res.json({ data, count, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

module.exports = router;
