'use strict';

require('dotenv').config();
const db = require('./supabase');
const logger = require('../utils/logger');

const MOCK_LEAGUES = [
  { external_id: '39', name: 'Premier League', country: 'England', logo_url: 'https://media.api-sports.io/football/leagues/39.png', season: '2026', is_active: true },
  { external_id: '140', name: 'La Liga', country: 'Spain', logo_url: 'https://media.api-sports.io/football/leagues/140.png', season: '2026', is_active: true }
];

const MOCK_TEAMS = [
  { external_id: '33', name: 'Manchester United', short_name: 'MUN', logo_url: 'https://media.api-sports.io/football/teams/33.png' },
  { external_id: '40', name: 'Liverpool', short_name: 'LIV', logo_url: 'https://media.api-sports.io/football/teams/40.png' },
  { external_id: '541', name: 'Real Madrid', short_name: 'RMA', logo_url: 'https://media.api-sports.io/football/teams/541.png' },
  { external_id: '529', name: 'Barcelona', short_name: 'BAR', logo_url: 'https://media.api-sports.io/football/teams/529.png' }
];

async function seed() {
  logger.info('[Seeder] Starting database seeding...');
  
  try {
    // 1. Seed Leagues
    logger.info('[Seeder] Seeding leagues...');
    const leagues = [];
    for (const l of MOCK_LEAGUES) {
      const res = await db.upsertLeague(l);
      leagues.push(res);
    }

    // 2. Seed Teams
    logger.info('[Seeder] Seeding teams...');
    const teams = [];
    for (const t of MOCK_TEAMS) {
      // Map to league
      const leagueName = t.name === 'Manchester United' || t.name === 'Liverpool' ? 'Premier League' : 'La Liga';
      const league = leagues.find(l => l.name === leagueName);
      const res = await db.upsertTeam({ ...t, league_id: league.id });
      teams.push(res);
    }

    const mun = teams.find(t => t.name === 'Manchester United');
    const liv = teams.find(t => t.name === 'Liverpool');
    const rma = teams.find(t => t.name === 'Real Madrid');
    const bar = teams.find(t => t.name === 'Barcelona');
    const pl = leagues.find(l => l.name === 'Premier League');
    const ll = leagues.find(l => l.name === 'La Liga');

    // 3. Seed Matches (1 Live, 1 Finished, 1 Not Started)
    logger.info('[Seeder] Seeding matches...');
    const matches = [
      {
        external_id: '101',
        home_team_id: mun.id,
        away_team_id: liv.id,
        home_team: mun.name,
        away_team: liv.name,
        home_score: 2,
        away_score: 1,
        status: 'LIVE',
        minute: 72,
        league_id: pl.id,
        league: pl.name,
        start_time: new Date().toISOString(),
        venue: 'Old Trafford',
        source: 'api'
      },
      {
        external_id: '102',
        home_team_id: rma.id,
        away_team_id: bar.id,
        home_team: rma.name,
        away_team: bar.name,
        home_score: 3,
        away_score: 2,
        status: 'FT',
        minute: 90,
        league_id: ll.id,
        league: ll.name,
        start_time: new Date(Date.now() - 3600 * 3000).toISOString(),
        venue: 'Santiago Bernabeu',
        source: 'api'
      },
      {
        external_id: '103',
        home_team_id: mun.id,
        away_team_id: rma.id,
        home_team: mun.name,
        away_team: rma.name,
        home_score: 0,
        away_score: 0,
        status: 'NS',
        minute: 0,
        league_id: pl.id,
        league: pl.name,
        start_time: new Date(Date.now() + 3600 * 24000).toISOString(),
        venue: 'Old Trafford',
        source: 'api'
      }
    ];

    const seededMatches = [];
    for (const m of matches) {
      const res = await db.upsertMatch(m);
      seededMatches.push(res);
    }

    const liveMatch = seededMatches.find(m => m.status === 'LIVE');
    const ftMatch = seededMatches.find(m => m.status === 'FT');

    // 4. Seed Events for live match
    logger.info('[Seeder] Seeding events...');
    const events = [
      { match_id: liveMatch.id, external_id: 'ev_1', type: 'goal', team_side: 'home', player: 'Marcus Rashford', minute: 14, extra: {} },
      { match_id: liveMatch.id, external_id: 'ev_2', type: 'yellow_card', team_side: 'away', player: 'Virgil van Dijk', minute: 32, extra: {} },
      { match_id: liveMatch.id, external_id: 'ev_3', type: 'goal', team_side: 'away', player: 'Mohamed Salah', minute: 55, extra: {} },
      { match_id: liveMatch.id, external_id: 'ev_4', type: 'goal', team_side: 'home', player: 'Bruno Fernandes', minute: 68, extra: {} }
    ];

    for (const ev of events) {
      await db.upsertEvent(ev);
    }

    // Seed events on live_match_state
    const { events: _, ...matchRow } = liveMatch;
    await db.upsertLiveState(liveMatch.id, { ...matchRow, events }, 'event_hash_mock_123');

    // 5. Seed Users
    logger.info('[Seeder] Seeding mock users...');
    const users = [
      { username: 'alex_striker', display_name: 'Alex Striker', total_points: 85 },
      { username: 'soccer_guru', display_name: 'Soccer Guru', total_points: 120 },
      { username: 'predict_master', display_name: 'Prediction Master', total_points: 95 }
    ];

    const seededUsers = [];
    for (const u of users) {
      const res = await db.query(d => d.from('users').upsert(u, { onConflict: 'username' }).select().single());
      seededUsers.push(res);
      // Create stats
      await db.query(d => d.from('user_stats').upsert({
        user_id: res.id,
        total_predictions: 15,
        correct_winners: 8,
        exact_scores: 4,
        correct_diffs: 2,
        total_points: res.total_points,
        accuracy_pct: 66.67
      }));
    }

    // 6. Seed AI Insight
    logger.info('[Seeder] Seeding AI insights...');
    await db.query(d => d.from('ai_insights').insert([
      {
        match_id: liveMatch.id,
        type: 'live',
        content: 'Manchester United increased attacking pressure after the 60th minute leading to the equalizer. Probability shift detected: +18% momentum.',
        model: 'gpt-4o-mini',
        tokens_used: 125
      },
      {
        match_id: ftMatch.id,
        type: 'post_match',
        content: 'Real Madrid sealed La Liga thriller following late winner. Real Madrid controlled midfield possession (58%) making critical direct passes.',
        model: 'gpt-4o-mini',
        tokens_used: 110
      }
    ]));

    logger.info('[Seeder] Database seeding completed successfully.');
  } catch (err) {
    logger.error(`[Seeder] Seeding failed: ${err.message}`, { stack: err.stack });
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
