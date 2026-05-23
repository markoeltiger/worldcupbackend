'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');
const cache = require('../../utils/cache');

const router = Router();

// GET /leagues
router.get('/', async (req, res, next) => {
  try {
    const data = await cache.getOrSet('api:leagues', () =>
      db.query(d => d.from('leagues').select('*').eq('is_active', true).order('name'))
    , 600);
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /leagues/:id/standings
router.get('/:id/standings', async (req, res, next) => {
  try {
    const data = await cache.getOrSet(`api:standings:${req.params.id}`, () =>
      db.query(d =>
        d.from('standings').select('*, teams(name, short_name, logo_url)')
          .eq('league_id', req.params.id).order('rank')
      )
    , 300);
    res.json({ data });
  } catch (err) { next(err); }
});

module.exports = router;
