'use strict';

/**
 * supabaseAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight Supabase client for REST / database operations ONLY.
 *
 * ✅ Safe for:  API routes, ingestion writes, queue processing, auth middleware
 * ❌ Must NOT:  initialize Realtime, open WebSocket connections
 *
 * WHY THIS IS SAFE ON NODE.JS 20
 * ──────────────────────────────
 * The @supabase/supabase-js SDK initializes a RealtimeClient internally when
 * createClient() is called — but it only opens a WebSocket connection when
 * .channel() or .subscribe() is actually called.  By never calling those
 * methods here AND by not passing a `realtime` config block (which can still
 * instantiate internal objects), we guarantee zero WebSocket activity.
 *
 * The `ws` package is required only by db/supabaseRealtime.js.
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

let _client = null;

/**
 * Returns the singleton REST-only Supabase admin client.
 * Fails loudly on missing credentials — fail-fast beats silent wrong state.
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
      persistSession:     false,  // Service role — no user session needed
      autoRefreshToken:   false,  // No refresh cycles
      detectSessionInUrl: false,  // No URL parsing
    },
    db:     { schema: 'public' },
    global: { headers: { 'x-application-name': 'goaliq-backend' } },
    // NOTE: We intentionally do NOT pass a `realtime` key here.
    // Passing any realtime config (even disabled values) can still
    // trigger SDK internals to construct a RealtimeClient object.
    // The correct approach is to simply never call .channel() on this client.
  });

  logger.info('[supabaseAdmin] REST-only admin client initialized (no WebSocket)');
  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a Supabase query builder and unwraps the result.
 * Throws a structured Error on Supabase-level failures.
 *
 * @param {function} builderFn  (client) => Promise<{data, error}>
 * @returns {Promise<any>}
 */
async function query(builderFn) {
  const client = getAdminClient();
  const { data, error } = await builderFn(client);
  if (error) {
    const err = new Error(`[DB] ${error.message}`);
    err.code    = error.code;
    err.details = error.details;
    err.hint    = error.hint;
    throw err;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Write Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function upsertMatch(matchData) {
  return query((db) =>
    db.from('matches').upsert(matchData, { onConflict: 'external_id' }).select().single()
  );
}

async function upsertEvent(eventData) {
  return query((db) =>
    db
      .from('events')
      .upsert(eventData, { onConflict: 'match_id,external_id', ignoreDuplicates: true })
      .select()
  );
}

async function upsertLiveState(matchId, state, eventHash) {
  return query((db) =>
    db.from('live_match_state').upsert(
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
// Backward-compatibility alias
// All existing require('../db/supabase').getClient() calls still work.
// ─────────────────────────────────────────────────────────────────────────────
const getClient = getAdminClient;

module.exports = {
  getAdminClient,
  getClient,       // legacy alias
  query,
  upsertMatch,
  upsertEvent,
  upsertLiveState,
  upsertLeague,
  upsertTeam,
};
