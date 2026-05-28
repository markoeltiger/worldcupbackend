'use strict';

/**
 * db/supabase.js  — COMPATIBILITY SHIM
 * ─────────────────────────────────────────────────────────────────────────────
 * This file exists purely for backward compatibility.
 * All real logic has moved to:
 *
 *   db/supabaseAdmin.js   ← REST / database clients (no WebSocket)
 *   db/supabaseRealtime.js ← Realtime broadcaster (ws transport)
 *
 * Every existing  require('../db/supabase')  continues to work unchanged
 * because we re-export the full supabaseAdmin surface here.
 *
 * ⚠️  Do NOT add Realtime initialization to this file.
 *     New code should import supabaseAdmin directly.
 */

module.exports = require('./supabaseAdmin');
