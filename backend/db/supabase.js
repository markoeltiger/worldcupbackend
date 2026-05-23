'use strict';

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

let _client = null;

/**
 * Returns a singleton Supabase admin client (service role — bypasses RLS).
 * Use ONLY in backend services, never expose service role key to the client.
 */
function getClient() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: {
      headers: { 'x-application-name': 'goaliq-backend' },
    },
  });

  logger.info('Supabase admin client initialized');
  return _client;
}

/**
 * Generic query helper with error unwrapping.
 * Throws a structured error on Supabase failure.
 */
async function query(builderFn) {
  const db = getClient();
  const { data, error } = await builderFn(db);
  if (error) {
    const err = new Error(`[DB] ${error.message}`);
    err.code = error.code;
    err.details = error.details;
    throw err;
  }
  return data;
}

/**
 * Upsert a match row. Returns the upserted row.
 */
async function upsertMatch(matchData) {
  return query((db) =>
    db.from('matches').upsert(matchData, { onConflict: 'external_id' }).select().single()
  );
}

/**
 * Upsert an event row. Deduplicates on (match_id, external_id).
 */
async function upsertEvent(eventData) {
  return query((db) =>
    db.from('events').upsert(eventData, { onConflict: 'match_id,external_id', ignoreDuplicates: true }).select()
  );
}

/**
 * Upsert the live_match_state cache row.
 */
async function upsertLiveState(matchId, state, eventHash) {
  return query((db) =>
    db
      .from('live_match_state')
      .upsert({ match_id: matchId, state, event_hash: eventHash, updated_at: new Date().toISOString() }, { onConflict: 'match_id' })
  );
}

/**
 * Upsert league/team helpers
 */
async function upsertLeague(leagueData) {
  return query((db) =>
    db.from('leagues').upsert(leagueData, { onConflict: 'external_id' }).select().single()
  );
}

async function upsertTeam(teamData) {
  return query((db) =>
    db.from('teams').upsert(teamData, { onConflict: 'external_id' }).select().single()
  );
}

module.exports = { getClient, query, upsertMatch, upsertEvent, upsertLiveState, upsertLeague, upsertTeam };
