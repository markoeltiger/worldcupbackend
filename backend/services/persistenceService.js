'use strict';

/**
 * Persistence Service
 * ==================
 * Database persistence for football data.
 * Upserts only, idempotent writes, minimal DB writes.
 */

const db = require('../db/supabase');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Upsert match
 */
async function upsertMatch(match) {
  try {
    if (!match || !match.external_id) {
      logger.warn('[Persistence] Invalid match data for upsert');
      return null;
    }

    const { data, error } = await db.getClient()
      .from('matches')
      .upsert({
        external_id: match.external_id,
        home_team: match.home_team?.name,
        away_team: match.away_team?.name,
        home_score: match.home_score || 0,
        away_score: match.away_score || 0,
        status: match.status || 'NS',
        minute: match.minute || 0,
        elapsed: match.elapsed,
        venue: match.venue?.name,
        league: match.league?.name,
        start_time: match.start_time,
        referee: match.referee,
        source: match.source || 'rapidapi',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'external_id'
      });

    if (error) throw error;
    logger.debug(`[Persistence] Upserted match ${match.external_id}`);
    return data;
  } catch (error) {
    logger.error(`[Persistence] Error upserting match: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert team
 */
async function upsertTeam(team) {
  try {
    if (!team || !team.name) {
      logger.warn('[Persistence] Invalid team data for upsert');
      return null;
    }

    const { data, error } = await db.getClient()
      .from('teams')
      .upsert({
        external_id: team.id,
        name: team.name,
        logo: team.logo,
        founded: team.founded,
        country: team.country,
        stadium: team.stadium,
        capacity: team.capacity,
        website: team.website,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'name'
      });

    if (error) throw error;
    logger.debug(`[Persistence] Upserted team ${team.name}`);
    return data;
  } catch (error) {
    logger.error(`[Persistence] Error upserting team: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert league
 */
async function upsertLeague(league) {
  try {
    if (!league || !league.name) {
      logger.warn('[Persistence] Invalid league data for upsert');
      return null;
    }

    const { data, error } = await db.getClient()
      .from('leagues')
      .upsert({
        external_id: league.id,
        name: league.name,
        country: league.country,
        logo: league.logo,
        season: league.season,
        type: league.type,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'name'
      });

    if (error) throw error;
    logger.debug(`[Persistence] Upserted league ${league.name}`);
    return data;
  } catch (error) {
    logger.error(`[Persistence] Error upserting league: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert match events
 */
async function upsertMatchEvents(matchId, events) {
  try {
    if (!matchId || !events || !Array.isArray(events)) {
      logger.warn('[Persistence] Invalid events data for upsert');
      return null;
    }

    // Delete existing events for this match
    await db.getClient()
      .from('events')
      .delete()
      .eq('match_id', matchId);

    // Insert new events
    if (events.length > 0) {
      const { data, error } = await db.getClient()
        .from('events')
        .insert(
          events.map(event => ({
            match_id: matchId,
            type: event.type,
            team_side: event.team_side,
            player: event.player,
            assist: event.assist,
            minute: event.minute,
            elapsed: event.elapsed,
            detail: event.detail,
            cards: event.cards,
            substitutions: event.substitutions,
            var: event.var,
          }))
        );

      if (error) throw error;
      logger.debug(`[Persistence] Upserted ${events.length} events for match ${matchId}`);
      return data;
    }

    return null;
  } catch (error) {
    logger.error(`[Persistence] Error upserting events: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert live match state
 */
async function upsertLiveMatchState(matchId, state) {
  try {
    if (!matchId || !state) {
      logger.warn('[Persistence] Invalid state data for upsert');
      return null;
    }

    const { data, error } = await db.getClient()
      .from('live_match_state')
      .upsert({
        match_id: matchId,
        status: state.status,
        minute: state.minute,
        elapsed: state.elapsed,
        home_score: state.home_score,
        away_score: state.away_score,
        possession: state.possession,
        shots: state.shots,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'match_id'
      });

    if (error) throw error;
    logger.debug(`[Persistence] Upserted live state for match ${matchId}`);
    return data;
  } catch (error) {
    logger.error(`[Persistence] Error upserting live state: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert standings
 */
async function upsertStandings(leagueId, standings) {
  try {
    if (!leagueId || !standings || !Array.isArray(standings)) {
      logger.warn('[Persistence] Invalid standings data for upsert');
      return null;
    }

    // Delete existing standings for this league
    await db.getClient()
      .from('standings')
      .delete()
      .eq('league_id', leagueId);

    // Insert new standings
    if (standings.length > 0) {
      const { data, error } = await db.getClient()
        .from('standings')
        .insert(
          standings.map(row => ({
            league_id: leagueId,
            team_name: row.team?.name,
            rank: row.rank,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goals_for: row.goals_for,
            goals_against: row.goals_against,
            goal_difference: row.goal_difference,
            points: row.points,
            form: row.form,
          }))
        );

      if (error) throw error;
      logger.debug(`[Persistence] Upserted ${standings.length} standings for league ${leagueId}`);
      return data;
    }

    return null;
  } catch (error) {
    logger.error(`[Persistence] Error upserting standings: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert player
 */
async function upsertPlayer(player) {
  try {
    if (!player || !player.name) {
      logger.warn('[Persistence] Invalid player data for upsert');
      return null;
    }

    const { data, error } = await db.getClient()
      .from('players')
      .upsert({
        external_id: player.id,
        name: player.name,
        team: player.team?.name,
        position: player.position,
        number: player.number,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'name,team'
      });

    if (error) throw error;
    logger.debug(`[Persistence] Upserted player ${player.name}`);
    return data;
  } catch (error) {
    logger.error(`[Persistence] Error upserting player: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert venue
 */
async function upsertVenue(venue) {
  try {
    if (!venue || !venue.name) {
      logger.warn('[Persistence] Invalid venue data for upsert');
      return null;
    }

    const { data, error } = await db.getClient()
      .from('venues')
      .upsert({
        external_id: venue.id,
        name: venue.name,
        city: venue.city,
        capacity: venue.capacity,
        surface: venue.surface,
        image: venue.image,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'name'
      });

    if (error) throw error;
    logger.debug(`[Persistence] Upserted venue ${venue.name}`);
    return data;
  } catch (error) {
    logger.error(`[Persistence] Error upserting venue: ${error.message}`);
    throw error;
  }
}

/**
 * Batch upsert matches
 */
async function batchUpsertMatches(matches) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return [];
  }

  const results = [];
  for (const match of matches) {
    try {
      const result = await upsertMatch(match);
      results.push(result);
    } catch (error) {
      logger.error(`[Persistence] Failed to upsert match ${match.external_id}: ${error.message}`);
    }
  }

  logger.info(`[Persistence] Batch upserted ${results.length}/${matches.length} matches`);
  return results;
}

/**
 * Batch upsert teams
 */
async function batchUpsertTeams(teams) {
  if (!teams || !Array.isArray(teams) || teams.length === 0) {
    return [];
  }

  const results = [];
  for (const team of teams) {
    try {
      const result = await upsertTeam(team);
      results.push(result);
    } catch (error) {
      logger.error(`[Persistence] Failed to upsert team ${team.name}: ${error.message}`);
    }
  }

  logger.info(`[Persistence] Batch upserted ${results.length}/${teams.length} teams`);
  return results;
}

/**
 * Check if match state has changed
 */
async function hasMatchStateChanged(matchId, newState) {
  try {
    const { data, error } = await db.getClient()
      .from('live_match_state')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    if (!data) return true;

    // Compare key fields
    const stateStr = JSON.stringify({
      status: newState.status,
      minute: newState.minute,
      home_score: newState.home_score,
      away_score: newState.away_score,
    });

    const oldStateStr = JSON.stringify({
      status: data.status,
      minute: data.minute,
      home_score: data.home_score,
      away_score: data.away_score,
    });

    return stateStr !== oldStateStr;
  } catch (error) {
    logger.error(`[Persistence] Error checking state change: ${error.message}`);
    return true; // Assume changed on error
  }
}

/**
 * Get match by external ID
 */
async function getMatchByExternalId(externalId) {
  try {
    const { data, error } = await db.getClient()
      .from('matches')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    logger.error(`[Persistence] Error getting match: ${error.message}`);
    return null;
  }
}

/**
 * Get live matches
 */
async function getLiveMatches() {
  try {
    const { data, error } = await db.getClient()
      .from('matches')
      .select('*')
      .in('status', ['LIVE', 'HT'])
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error(`[Persistence] Error getting live matches: ${error.message}`);
    return [];
  }
}

module.exports = {
  upsertMatch,
  upsertTeam,
  upsertLeague,
  upsertMatchEvents,
  upsertLiveMatchState,
  upsertStandings,
  upsertPlayer,
  upsertVenue,
  batchUpsertMatches,
  batchUpsertTeams,
  hasMatchStateChanged,
  getMatchByExternalId,
  getLiveMatches,
};
