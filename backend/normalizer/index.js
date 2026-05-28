'use strict';

const crypto = require('crypto');

/**
 * ============================================================
 * NORMALIZATION ENGINE
 * Converts raw data from any source into the unified GoalIQ
 * match schema. Add new adapters as new data sources are added.
 * ============================================================
 */

const VALID_STATUSES = new Set(['NS', 'LIVE', 'HT', 'FT', 'POSTPONED', 'CANCELLED', 'SUSPENDED']);

// ---- Status mapping per source --------------------------------

const API_FOOTBALL_STATUS_MAP = {
  NS: 'NS', '1H': 'LIVE', HT: 'HT', '2H': 'LIVE',
  ET: 'LIVE', P: 'LIVE', FT: 'FT', AET: 'FT',
  PEN: 'FT', BT: 'LIVE', SUSP: 'SUSPENDED',
  INT: 'LIVE', PST: 'POSTPONED', CANC: 'CANCELLED',
  ABD: 'CANCELLED', AWD: 'FT', WO: 'FT', LIVE: 'LIVE',
};

const SPORTSDB_STATUS_MAP = {
  'Not Started': 'NS',
  'In Progress': 'LIVE',
  'Half Time': 'HT',
  Finished: 'FT',
  Postponed: 'POSTPONED',
  Cancelled: 'CANCELLED',
};

const FOOTBALL_DATA_STATUS_MAP = {
  TIMED: 'NS',
  SCHEDULED: 'NS',
  LIVE: 'LIVE',
  IN_PLAY: 'LIVE',
  PAUSED: 'HT',
  FINISHED: 'FT',
  POSTPONED: 'POSTPONED',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
};

// ---- Event type mapping ---------------------------------------

const API_FOOTBALL_EVENT_MAP = {
  Goal: 'goal', Card: null /* handled below */, subst: 'substitution',
  Var: 'var', 'Own Goal': 'own_goal', 'Penalty': 'penalty',
};

// ---- Helpers --------------------------------------------------

function normalizeStatus(raw, source = 'api_football') {
  if (!raw) return 'NS';
  if (VALID_STATUSES.has(raw)) return raw;
  if (source === 'sportsdb') return SPORTSDB_STATUS_MAP[raw] || 'NS';
  if (source === 'football_data') return FOOTBALL_DATA_STATUS_MAP[raw] || 'NS';
  return API_FOOTBALL_STATUS_MAP[raw] || 'NS';
}


function normalizeEventType(rawType, rawDetail) {
  if (!rawType) return null;
  const type = rawType.toLowerCase();
  if (type === 'goal') return rawDetail?.toLowerCase().includes('own') ? 'own_goal' : 'goal';
  if (type === 'card') return rawDetail?.toLowerCase().includes('red') ? 'red_card' : 'yellow_card';
  if (type === 'subst') return 'substitution';
  if (type === 'var') return 'var';
  return null;
}

function hashEvents(events = []) {
  const str = events.map((e) => `${e.type}:${e.minute}:${e.player}`).join('|');
  return crypto.createHash('md5').update(str).digest('hex');
}

// ---- Main adapters --------------------------------------------

/**
 * Normalize an API-Football fixture object.
 * Docs: https://www.api-sports.io/documentation/football/v3
 */
function fromApiFootball(fixture) {
  const { fixture: f, league, teams, goals, score, events = [] } = fixture;

  const normalizedEvents = events
    .map((ev) => {
      const type = normalizeEventType(ev.type, ev.detail);
      if (!type) return null;
      return {
        external_id: `${f.id}:${ev.type}:${ev.time?.elapsed}:${ev.player?.id}`,
        type,
        team_side: ev.team?.id === teams?.home?.id ? 'home' : 'away',
        player: ev.player?.name || null,
        player_id: ev.player?.id?.toString() || null,
        assist_player: ev.assist?.name || null,
        minute: ev.time?.elapsed || 0,
        extra_time: ev.time?.extra || 0,
        extra: { detail: ev.detail, comments: ev.comments },
      };
    })
    .filter(Boolean);

  return {
    external_id: f.id?.toString(),
    home_team: teams?.home?.name || '',
    away_team: teams?.away?.name || '',
    home_score: goals?.home ?? 0,
    away_score: goals?.away ?? 0,
    status: normalizeStatus(f.status?.short, 'api_football'),
    minute: f.status?.elapsed || 0,
    league: league?.name || '',
    start_time: f.date,
    venue: f.venue?.name || null,
    referee: f.referee || null,
    source: 'api_football',
    events: normalizedEvents,
    _eventHash: hashEvents(normalizedEvents),
    _meta: {
      home_team_external_id: teams?.home?.id?.toString(),
      away_team_external_id: teams?.away?.id?.toString(),
      home_team_logo: teams?.home?.logo,
      away_team_logo: teams?.away?.logo,
      league_external_id: league?.id?.toString(),
      league_logo: league?.logo,
      season: league?.season?.toString(),
      country: league?.country,
    },
    updated_at: new Date().toISOString(),
  };
}

/**
 * Normalize a TheSportsDB event object.
 */
function fromSportsDB(event) {
  return {
    external_id: event.idEvent,
    home_team: event.strHomeTeam || '',
    away_team: event.strAwayTeam || '',
    home_score: parseInt(event.intHomeScore, 10) || 0,
    away_score: parseInt(event.intAwayScore, 10) || 0,
    status: normalizeStatus(event.strStatus, 'sportsdb'),
    minute: parseInt(event.intProgress, 10) || 0,
    league: event.strLeague || '',
    start_time: event.strTimestamp || event.dateEvent,
    venue: event.strVenue || null,
    referee: null,
    source: 'sportsdb',
    events: [],
    _eventHash: hashEvents([]),
    _meta: {
      league_external_id: event.idLeague,
      home_team_external_id: event.idHomeTeam,
      away_team_external_id: event.idAwayTeam,
    },
    updated_at: new Date().toISOString(),
  };
}

/**
 * Normalize a scraper result object.
 * Shape defined in scraper/index.js.
 */
function fromScraper(scraped) {
  const events = (scraped.events || []).map((ev) => ({
    external_id: `scraper:${ev.minute}:${ev.type}:${ev.player || ''}`,
    type: ev.type,
    team_side: ev.team || 'home',
    player: ev.player || null,
    player_id: null,
    assist_player: null,
    minute: ev.minute || 0,
    extra_time: 0,
    extra: {},
  }));

  return {
    external_id: scraped.match_id,
    home_team: scraped.home_team || '',
    away_team: scraped.away_team || '',
    home_score: scraped.home_score || 0,
    away_score: scraped.away_score || 0,
    status: normalizeStatus(scraped.status, 'api_football'),
    minute: scraped.minute || 0,
    league: scraped.league || '',
    start_time: scraped.start_time || new Date().toISOString(),
    venue: null,
    referee: null,
    source: 'scraper',
    events,
    _eventHash: hashEvents(events),
    _meta: {},
    updated_at: new Date().toISOString(),
  };
}

/**
 * Normalize a football-data.org match object.
 */
function fromFootballData(match) {
  const score = match.score || {};
  const fullTime = score.fullTime || {};
  const homeScore = fullTime.home ?? 0;
  const awayScore = fullTime.away ?? 0;
  
  const events = [];

  return {
    external_id: match.id?.toString(),
    home_team: match.homeTeam?.name || match.homeTeam?.shortName || '',
    away_team: match.awayTeam?.name || match.awayTeam?.shortName || '',
    home_score: homeScore,
    away_score: awayScore,
    status: normalizeStatus(match.status, 'football_data'),
    minute: match.status === 'LIVE' || match.status === 'IN_PLAY' ? 45 : 0,
    league: match.competition?.name || '',
    start_time: match.utcDate,
    venue: null,
    referee: null,
    source: 'football_data',
    events,
    _eventHash: hashEvents(events),
    _meta: {
      league_external_id: match.competition?.id?.toString(),
      league_code: match.competition?.code,
      home_team_external_id: match.homeTeam?.id?.toString(),
      away_team_external_id: match.awayTeam?.id?.toString(),
      home_team_logo: match.homeTeam?.crest,
      away_team_logo: match.awayTeam?.crest,
    },
    updated_at: new Date().toISOString(),
  };
}

const THESPORTS_STATUS_MAP = {
  1: 'NS',
  2: 'LIVE',
  3: 'HT',
  4: 'LIVE',
  5: 'LIVE',
  6: 'LIVE',
  7: 'FT',
  8: 'POSTPONED',
  9: 'CANCELLED',
  10: 'SUSPENDED'
};

const THESPORTS_EVENT_MAP = {
  1: 'goal',
  2: 'red_card',
  3: 'yellow_card',
  4: 'substitution',
  7: 'own_goal',
  8: 'penalty',
  9: 'red_card' // Double yellow
};

function fromTheSports(match) {
  const normalizedEvents = (match.events || []).map((ev) => {
    const type = THESPORTS_EVENT_MAP[ev.type];
    if (!type) return null;
    return {
      external_id: `${match.id}:${ev.type}:${ev.time}:${ev.player_name || ''}`,
      type,
      team_side: ev.team === 1 ? 'home' : 'away',
      player: ev.player_name || null,
      player_id: null,
      assist_player: null,
      minute: ev.time || 0,
      extra_time: 0,
      extra: { detail: ev.detail || '' }
    };
  }).filter(Boolean);

  return {
    external_id: match.id?.toString(),
    home_team: match.home_team?.name || '',
    away_team: match.away_team?.name || '',
    home_score: match.home_scores?.[0] ?? 0,
    away_score: match.away_scores?.[0] ?? 0,
    status: THESPORTS_STATUS_MAP[match.status_id] || 'NS',
    minute: match.match_time ? Math.max(0, Math.floor((Date.now() / 1000 - match.match_time) / 60)) : 0,
    league: match.competition?.name || '',
    start_time: match.match_time ? new Date(match.match_time * 1000).toISOString() : new Date().toISOString(),
    venue: match.venue?.name || null,
    referee: null,
    source: 'thesports',
    events: normalizedEvents,
    _eventHash: hashEvents(normalizedEvents),
    _meta: {
      home_team_external_id: match.home_team_id?.toString(),
      away_team_external_id: match.away_team_id?.toString(),
      home_team_logo: match.home_team?.logo,
      away_team_logo: match.away_team?.logo,
      league_external_id: match.competition_id?.toString(),
      league_logo: match.competition?.logo,
      season: match.season || new Date().getFullYear().toString()
    },
    updated_at: new Date().toISOString()
  };
}

module.exports = { fromApiFootball, fromSportsDB, fromScraper, fromFootballData, fromTheSports, hashEvents };

