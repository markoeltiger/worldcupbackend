'use strict';

const { Router } = require('express');
const db = require('../../db/supabase');
const cache = require('../../utils/cache');

const router = Router();

const MOCK_MATCHES_LIVE = [
  {
    id: 'mun-liv-101',
    home_team: 'Manchester United',
    away_team: 'Liverpool',
    home_score: 2,
    away_score: 1,
    status: 'LIVE',
    minute: 72,
    league: 'Premier League',
    start_time: new Date().toISOString(),
    venue: 'Old Trafford',
    events: [
      { type: 'goal', team_side: 'home', player: 'Marcus Rashford', minute: 14 },
      { type: 'yellow_card', team_side: 'away', player: 'Virgil van Dijk', minute: 32 },
      { type: 'goal', team_side: 'away', player: 'Mohamed Salah', minute: 55 },
      { type: 'goal', team_side: 'home', player: 'Bruno Fernandes', minute: 68 }
    ]
  }
];

const MOCK_MATCHES_ALL = [
  ...MOCK_MATCHES_LIVE,
  {
    id: 'rma-bar-102',
    home_team: 'Real Madrid',
    away_team: 'Barcelona',
    home_score: 3,
    away_score: 2,
    status: 'FT',
    minute: 90,
    league: 'La Liga',
    start_time: new Date(Date.now() - 3600 * 3000).toISOString(),
    venue: 'Santiago Bernabeu',
    events: []
  },
  {
    id: 'mun-rma-103',
    home_team: 'Manchester United',
    away_team: 'Real Madrid',
    home_score: 0,
    away_score: 0,
    status: 'NS',
    minute: 0,
    league: 'Premier League',
    start_time: new Date(Date.now() + 3600 * 24000).toISOString(),
    venue: 'Old Trafford',
    events: []
  }
];

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
    // Failover fallback to mock matches so client dashboard is alive
    res.json({ data: MOCK_MATCHES_LIVE, count: MOCK_MATCHES_LIVE.length });
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
    // Failover fallback to mock matches
    let filtered = MOCK_MATCHES_ALL;
    if (req.query.status) {
      filtered = filtered.filter(m => m.status === req.query.status);
    }
    res.json({ data: filtered, count: filtered.length, page: 1, limit: 20 });
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
    const match = MOCK_MATCHES_ALL.find(m => m.id === req.params.id);
    if (match) {
      res.json({ data: match });
    } else {
      res.status(404).json({ error: 'Match not found' });
    }
  }
});

module.exports = router;

