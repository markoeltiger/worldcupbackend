'use strict';

/**
 * supabaseRealtime.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated Supabase client for Realtime / WebSocket broadcasting ONLY.
 *
 * ✅ Safe for:  realtime/broadcaster — live match updates, score events, goals
 * ❌ Must NOT:  be imported by API routes, middleware, or ingestion services
 *
 * This file explicitly injects the `ws` npm package as the WebSocket transport,
 * which is required on Node.js 20 (which ships without a native WebSocket
 * implementation that the @supabase/realtime SDK expects).
 *
 * The client is lazily initialized — it only creates the WebSocket connection
 * when broadcastMatchUpdate() is first called by the ingestion pipeline,
 * NOT on server startup or REST API requests.
 */

const { createClient } = require('@supabase/supabase-js');
const WebSocket        = require('ws');
const logger           = require('../utils/logger');

let _client = null;

/**
 * Returns the singleton Supabase Realtime client.
 * Lazily initialized — safe to import without starting a connection.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getRealtimeClient() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('[supabaseRealtime] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _client = createClient(url, key, {
    auth: {
      persistSession:     false,
      autoRefreshToken:   false,
      detectSessionInUrl: false,
    },
    db: { schema: 'public' },
    global: {
      headers: { 'x-application-name': 'goaliq-realtime' },
    },
    // ─── INJECT ws TRANSPORT ─────────────────────────────────────────────────
    // Node.js 20 does not ship a global WebSocket.  We inject the `ws` package
    // so the Supabase Realtime client can open a proper WebSocket connection.
    realtime: {
      params:    { eventsPerSecond: 10 },
      transport: WebSocket,             // ← key fix for Node.js 20
    },
  });

  logger.info('[supabaseRealtime] Realtime client initialized with ws transport');
  return _client;
}

module.exports = { getRealtimeClient };
