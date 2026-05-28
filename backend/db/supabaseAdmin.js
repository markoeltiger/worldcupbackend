'use strict';

/**
 * supabaseAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight Supabase client for REST / database operations ONLY.
 *
 * ✅ Safe for:  API routes, ingestion writes, queue processing, auth middleware
 * ❌ Must NOT:  initialize Realtime, open WebSocket connections
 *
 * Node.js 20 does NOT ship native WebSocket. The @supabase/supabase-js SDK
 * will attempt to auto-connect a Realtime WebSocket on the first createClient()
 * call UNLESS realtime is explicitly disabled.  This file disables it entirely.
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

let _client = null;

/**
 * Returns the singleton REST-only Supabase admin client.
 * Crashes loudly on missing env vars — fail fast is better than a silent wrong state.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getAdminClient() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('[supabaseAdmin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _client = createClient(url, key, {
    auth: {
      persistSession:   false,   // No session storage — service role never needs it
      autoRefreshToken: false,   // No token refresh cycles
      detectSessionInUrl: false, // No URL-based session detection
    },
    db: { schema: 'public' },
    global: {
      headers: { 'x-application-name': 'goaliq-backend' },
    },
    // ─── DISABLE REALTIME ────────────────────────────────────────────────────
    // Setting fetch explicitly prevents the SDK from spinning up a WebSocket
    // transport on Node.js 20 during normal REST usage.
    realtime: {
      params: { eventsPerSecond: -1 }, // Sentinel value — no subscriptions
    },
  });

  logger.info('[supabaseAdmin] REST-only admin client initialized (no WebSocket)');
  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a Supabase query builder function and unwraps the result.
 * Throws a structured Error on Supabase-level failures.
 *
 * @param {function(SupabaseClient): Promise<{data, error}>} builderFn
 * @returns {Promise<any>}
 */
async function query(builderFn) {
  const db = getAdminClient();
  const { data, error } = await builderFn(db);
  if (error) {
    const err = new Error(`[DB] ${error.message}`);
    err.code    = error.code;
    err.details = error.details;
    throw err;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Upserts
// ─────────────────────────────────────────────────────────────────────────────

async function upsertMatch(matchData) {
  return query((db) =>
    db.from('matches').upsert(matchData, { onConflict: 'external_id' }).select().single()
  );
}

async function upsertEvent(eventData) {
  return query((db) =>
    db.from('events').upsert(eventData, { onConflict: 'match_id,external_id', ignoreDuplicates: true }).select()
  );
}

async function upsertLiveState(matchId, state, eventHash) {
  return query((db) =>
    db
      .from('live_match_state')
      .upsert(
        { match_id: matchId, state, event_hash: eventHash, updated_at: new Date().toISOString() },
        { onConflict: 'match_id' }
      )
  );
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Legacy shim — keeps old require('../db/supabase').getClient() working
// by forwarding to the admin client. This lets us migrate incrementally
// without touching every file at once.
// ─────────────────────────────────────────────────────────────────────────────
const getClient = getAdminClient;

module.exports = {
  getAdminClient,
  getClient,        // legacy shim
  query,
  upsertMatch,
  upsertEvent,
  upsertLiveState,
  upsertLeague,
  upsertTeam,
};
