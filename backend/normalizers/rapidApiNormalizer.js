'use strict';

/**
 * RapidAPI Normalizer
 * ===================
 * Normalizes RapidAPI responses into unified schema.
 * Ensures compatibility with existing DB schema.
 */

const logger = require('../utils/logger');

/**
 * Normalize match data
 */
function normalizeMatch(rawMatch) {
  if (!rawMatch) return null;

  try {
    return {
      external_id: rawMatch.id?.toString() || null,
      home_team: normalizeTeam(rawMatch.home),
      away_team: normalizeTeam(rawMatch.away),
      home_score: parseInt(rawMatch.home_score) || 0,
      away_score: parseInt(rawMatch.away_score) || 0,
      status: normalizeStatus(rawMatch.status),
      minute: parseInt(rawMatch.minute) || 0,
      elapsed: parseInt(rawMatch.elapsed) || null,
      venue: normalizeVenue(rawMatch.venue),
      league: normalizeLeague(rawMatch.league),
      start_time: normalizeTimestamp(rawMatch.date),
      referee: rawMatch.referee || null,
      events: normalizeEvents(rawMatch.events),
      lineups: normalizeLineups(rawMatch.lineups),
      statistics: normalizeStatistics(rawMatch.statistics),
      source: 'rapidapi',
      raw_data: rawMatch,
    };
  } catch (error) {
    logger.error(`[Normalizer] Error normalizing match: ${error.message}`);
    return null;
  }
}

/**
 * Normalize team data
 */
function normalizeTeam(rawTeam) {
  if (!rawTeam) return null;

  return {
    id: rawTeam.id?.toString() || null,
    name: rawTeam.name || null,
    logo: rawTeam.logo || null,
    founded: rawTeam.founded || null,
    country: rawTeam.country || null,
    stadium: rawTeam.stadium || null,
    capacity: rawTeam.capacity || null,
    website: rawTeam.website || null,
    raw_data: rawTeam,
  };
}

/**
 * Normalize league data
 */
function normalizeLeague(rawLeague) {
  if (!rawLeague) return null;

  return {
    id: rawLeague.id?.toString() || null,
    name: rawLeague.name || null,
    country: rawLeague.country || null,
    logo: rawLeague.logo || null,
    season: rawLeague.season || null,
    type: rawLeague.type || null,
    raw_data: rawLeague,
  };
}

/**
 * Normalize venue data
 */
function normalizeVenue(rawVenue) {
  if (!rawVenue) return null;

  return {
    id: rawVenue.id?.toString() || null,
    name: rawVenue.name || null,
    city: rawVenue.city || null,
    capacity: rawVenue.capacity || null,
    surface: rawVenue.surface || null,
    image: rawVenue.image || null,
    raw_data: rawVenue,
  };
}

/**
 * Normalize status
 */
function normalizeStatus(status) {
  if (!status) return 'NS';
  
  const s = status.toLowerCase();
  if (s.includes('live') || s.includes("'")) return 'LIVE';
  if (s.includes('half time') || s.includes('ht')) return 'HT';
  if (s.includes('full time') || s.includes('ft')) return 'FT';
  if (s.includes('postponed')) return 'POSTPONED';
  if (s.includes('cancelled')) return 'CANCELLED';
  if (s.includes('suspended')) return 'SUSPENDED';
  if (s.includes('not started') || s === 'ns') return 'NS';
  
  return 'NS';
}

/**
 * Normalize timestamp
 */
function normalizeTimestamp(timestamp) {
  if (!timestamp) return null;
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * Normalize match events
 */
function normalizeEvents(rawEvents) {
  if (!rawEvents || !Array.isArray(rawEvents)) return [];

  return rawEvents.map(event => {
    try {
      return {
        type: normalizeEventType(event.type),
        team_side: determineTeamSide(event.team),
        player: event.player || null,
        assist: event.assist || null,
        minute: parseInt(event.minute) || 0,
        elapsed: parseInt(event.elapsed) || null,
        detail: event.detail || null,
        cards: normalizeCards(event.cards),
        substitutions: normalizeSubstitutions(event.substitutions),
        var: event.var || false,
        raw_data: event,
      };
    } catch (error) {
      logger.warn(`[Normalizer] Error normalizing event: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Normalize event type
 */
function normalizeEventType(type) {
  if (!type) return 'unknown';
  
  const t = type.toLowerCase();
  if (t.includes('goal')) return 'goal';
  if (t.includes('yellow')) return 'yellow_card';
  if (t.includes('red')) return 'red_card';
  if (t.includes('sub')) return 'substitution';
  if (t.includes('penalty')) return 'penalty';
  if (t.includes('own')) return 'own_goal';
  if (t.includes('var')) return 'var';
  if (t.includes('corner')) return 'corner';
  if (t.includes('foul')) return 'foul';
  
  return 'unknown';
}

/**
 * Determine team side
 */
function determineTeamSide(team) {
  if (!team) return 'home';
  
  const t = team.toLowerCase();
  if (t.includes('home')) return 'home';
  if (t.includes('away')) return 'away';
  
  return 'home';
}

/**
 * Normalize cards
 */
function normalizeCards(rawCards) {
  if (!rawCards || !Array.isArray(rawCards)) return [];
  
  return rawCards.map(card => ({
    type: card.type || null,
    player: card.player || null,
    minute: parseInt(card.minute) || 0,
    raw_data: card,
  }));
}

/**
 * Normalize substitutions
 */
function normalizeSubstitutions(rawSubs) {
  if (!rawSubs || !Array.isArray(rawSubs)) return [];
  
  return rawSubs.map(sub => ({
    player_in: sub.player_in || null,
    player_out: sub.player_out || null,
    minute: parseInt(sub.minute) || 0,
    raw_data: sub,
  }));
}

/**
 * Normalize lineups
 */
function normalizeLineups(rawLineups) {
  if (!rawLineups) return null;

  return {
    home: normalizeTeamLineup(rawLineups.home),
    away: normalizeTeamLineup(rawLineups.away),
    raw_data: rawLineups,
  };
}

/**
 * Normalize team lineup
 */
function normalizeTeamLineup(rawTeamLineup) {
  if (!rawTeamLineup) return null;

  return {
    formation: rawTeamLineup.formation || null,
    starting_xi: normalizePlayers(rawTeamLineup.starting_xi),
    substitutes: normalizePlayers(rawTeamLineup.substitutes),
    coach: rawTeamLineup.coach || null,
    raw_data: rawTeamLineup,
  };
}

/**
 * Normalize players
 */
function normalizePlayers(rawPlayers) {
  if (!rawPlayers || !Array.isArray(rawPlayers)) return [];

  return rawPlayers.map(player => ({
    id: player.id?.toString() || null,
    name: player.name || null,
    number: player.number || null,
    position: player.position || null,
    captain: player.captain || false,
    raw_data: player,
  }));
}

/**
 * Normalize statistics
 */
function normalizeStatistics(rawStats) {
  if (!rawStats) return null;

  return {
    possession: normalizePossession(rawStats.possession),
    shots: normalizeShots(rawStats.shots),
    shots_on_target: normalizeShots(rawStats.shots_on_target),
    corners: normalizeTeamStats(rawStats.corners),
    fouls: normalizeTeamStats(rawStats.fouls),
    yellow_cards: normalizeTeamStats(rawStats.yellow_cards),
    red_cards: normalizeTeamStats(rawStats.red_cards),
    offsides: normalizeTeamStats(rawStats.offsides),
    passes: normalizeTeamStats(rawStats.passes),
    pass_accuracy: normalizePassAccuracy(rawStats.pass_accuracy),
    raw_data: rawStats,
  };
}

/**
 * Normalize possession
 */
function normalizePossession(rawPossession) {
  if (!rawPossession) return { home: 50, away: 50 };
  
  if (typeof rawPossession === 'object') {
    return {
      home: parseInt(rawPossession.home) || 50,
      away: parseInt(rawPossession.away) || 50,
    };
  }
  
  // If it's a single number, assume it's home possession
  const home = parseInt(rawPossession) || 50;
  return { home, away: 100 - home };
}

/**
 * Normalize shots
 */
function normalizeShots(rawShots) {
  if (!rawShots) return { home: 0, away: 0 };
  
  if (typeof rawShots === 'object') {
    return {
      home: parseInt(rawShots.home) || 0,
      away: parseInt(rawShots.away) || 0,
    };
  }
  
  return { home: 0, away: 0 };
}

/**
 * Normalize team stats
 */
function normalizeTeamStats(rawStats) {
  if (!rawStats) return { home: 0, away: 0 };
  
  if (typeof rawStats === 'object') {
    return {
      home: parseInt(rawStats.home) || 0,
      away: parseInt(rawStats.away) || 0,
    };
  }
  
  return { home: 0, away: 0 };
}

/**
 * Normalize pass accuracy
 */
function normalizePassAccuracy(rawAccuracy) {
  if (!rawAccuracy) return { home: 0, away: 0 };
  
  if (typeof rawAccuracy === 'object') {
    return {
      home: parseInt(rawAccuracy.home) || 0,
      away: parseInt(rawAccuracy.away) || 0,
    };
  }
  
  return { home: 0, away: 0 };
}

/**
 * Normalize standings
 */
function normalizeStandings(rawStandings) {
  if (!rawStandings || !Array.isArray(rawStandings)) return [];

  return rawStandings.map(row => {
    try {
      return {
        rank: parseInt(row.rank) || 0,
        team: normalizeTeam(row.team),
        played: parseInt(row.played) || 0,
        won: parseInt(row.won) || 0,
        drawn: parseInt(row.drawn) || 0,
        lost: parseInt(row.lost) || 0,
        goals_for: parseInt(row.goals_for) || 0,
        goals_against: parseInt(row.goals_against) || 0,
        goal_difference: (parseInt(row.goals_for) || 0) - (parseInt(row.goals_against) || 0),
        points: parseInt(row.points) || 0,
        form: row.form || null,
        raw_data: row,
      };
    } catch (error) {
      logger.warn(`[Normalizer] Error normalizing standings row: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Normalize player stats
 */
function normalizePlayerStats(rawPlayerStats) {
  if (!rawPlayerStats) return null;

  return {
    player: normalizeTeam(rawPlayerStats.player),
    team: normalizeTeam(rawPlayerStats.team),
    season: rawPlayerStats.season || null,
    appearances: parseInt(rawPlayerStats.appearances) || 0,
    goals: parseInt(rawPlayerStats.goals) || 0,
    assists: parseInt(rawPlayerStats.assists) || 0,
    yellow_cards: parseInt(rawPlayerStats.yellow_cards) || 0,
    red_cards: parseInt(rawPlayerStats.red_cards) || 0,
    minutes_played: parseInt(rawPlayerStats.minutes_played) || 0,
    raw_data: rawPlayerStats,
  };
}

/**
 * Normalize H2H data
 */
function normalizeH2H(rawH2H) {
  if (!rawH2H) return null;

  return {
    matches: normalizeMatches(rawH2H.matches),
    total_matches: parseInt(rawH2H.total_matches) || 0,
    home_wins: parseInt(rawH2H.home_wins) || 0,
    away_wins: parseInt(rawH2H.away_wins) || 0,
    draws: parseInt(rawH2H.draws) || 0,
    home_goals: parseInt(rawH2H.home_goals) || 0,
    away_goals: parseInt(rawH2H.away_goals) || 0,
    raw_data: rawH2H,
  };
}

/**
 * Normalize multiple matches
 */
function normalizeMatches(rawMatches) {
  if (!rawMatches || !Array.isArray(rawMatches)) return [];

  return rawMatches.map(match => normalizeMatch(match)).filter(Boolean);
}

/**
 * Validate normalized match
 */
function validateMatch(match) {
  if (!match) return false;
  
  // Required fields
  if (!match.external_id) return false;
  if (!match.home_team || !match.home_team.name) return false;
  if (!match.away_team || !match.away_team.name) return false;
  
  return true;
}

/**
 * Validate normalized team
 */
function validateTeam(team) {
  if (!team) return false;
  
  if (!team.name) return false;
  
  return true;
}

module.exports = {
  normalizeMatch,
  normalizeTeam,
  normalizeLeague,
  normalizeVenue,
  normalizeEvents,
  normalizeLineups,
  normalizeStatistics,
  normalizeStandings,
  normalizePlayerStats,
  normalizeH2H,
  normalizeMatches,
  validateMatch,
  validateTeam,
};
