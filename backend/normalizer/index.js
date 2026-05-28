'use strict';

const crypto = require('crypto');

/**
 * ============================================================
 * NORMALIZATION ENGINE - API-FOOTBALL ONLY
 * Converts raw API-Football data into the unified GoalIQ match schema.
 * ============================================================
 */

const VALID_STATUSES = new Set(['NS', 'LIVE', 'HT', 'FT', 'POSTPONED', 'CANCELLED', 'SUSPENDED']);

// ---- Status mapping for API-Football --------------------------------

const API_FOOTBALL_STATUS_MAP = {
  NS: 'NS', '1H': 'LIVE', HT: 'HT', '2H': 'LIVE',
  ET: 'LIVE', P: 'LIVE', FT: 'FT', AET: 'FT',
  PEN: 'FT', BT: 'LIVE', SUSP: 'SUSPENDED',
  INT: 'LIVE', PST: 'POSTPONED', CANC: 'CANCELLED',
  ABD: 'CANCELLED', AWD: 'FT', WO: 'FT', LIVE: 'LIVE',
};

// ---- Helpers --------------------------------------------------

function normalizeStatus(raw) {
  if (!raw) return 'NS';
  if (VALID_STATUSES.has(raw)) return raw;
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
    status: normalizeStatus(f.status?.short),
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

module.exports = { fromApiFootball, hashEvents };

