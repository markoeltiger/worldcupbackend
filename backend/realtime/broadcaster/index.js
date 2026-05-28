'use strict';

/**
 * broadcaster/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Realtime broadcast layer — the ONLY place in the backend that uses WebSockets.
 *
 * IMPORTANT: This broadcaster is ONLY used for LIVE matches.
 * The ingestion service only processes live matches from API-Football,
 * so this broadcaster will never receive updates for finished/historical matches.
 *
 * Uses supabaseRealtime (ws-transport client) exclusively.
 * API routes, ingestion, and middleware must NEVER import this file directly;
 * they interact with it only via batchAggregator.flush().
 */

const { getRealtimeClient } = require('../../db/supabaseRealtime');
const logger                = require('../../utils/logger');

let channelInstance = null;

/**
 * Lazily initializes the Supabase Realtime channel.
 * Called only on the first broadcast — not at module load time.
 *
 * @returns {object|null} Supabase Channel instance or null on failure
 */
function getChannel() {
  if (channelInstance) return channelInstance;

  try {
    const supabase = getRealtimeClient();

    channelInstance = supabase.channel('gooly-live-matches', {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    channelInstance.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('[Realtime Broadcaster] Channel SUBSCRIBED — ready to broadcast');
      } else {
        logger.info(`[Realtime Broadcaster] Channel status: ${status}`);
      }
    });

    return channelInstance;
  } catch (err) {
    logger.error(`[Realtime Broadcaster] Failed to initialize channel: ${err.message}`);
    return null;
  }
}

/**
 * Broadcasts a compact, real-time match update packet to connected clients.
 *
 * Payload is deliberately minimal to save bandwidth and reduce client parse time:
 * - Only changed fields are included
 * - Timeline events are stripped to {type, player, minute, team_side}
 *
 * @param {string}        matchId    - Match identifier
 * @param {Array<object>} newEvents  - Deduplicated new timeline events
 * @param {object}        stateDiff  - Changed fields: home_score, away_score, status, minute
 */
async function broadcastMatchUpdate(matchId, newEvents = [], stateDiff = {}) {
  const channel = getChannel();
  if (!channel) {
    logger.warn('[Realtime Broadcaster] No active channel — skipping broadcast');
    return;
  }

  const payload = {
    match_id:   matchId,
    home_score: stateDiff.home_score  !== undefined ? stateDiff.home_score  : null,
    away_score: stateDiff.away_score  !== undefined ? stateDiff.away_score  : null,
    status:     stateDiff.status      !== undefined ? stateDiff.status      : null,
    minute:     stateDiff.minute      !== undefined ? stateDiff.minute      : null,
    timestamp:  new Date().toISOString(),
  };

  if (newEvents && newEvents.length > 0) {
    payload.events = newEvents.map((e) => {
      const p = e.payload || e;
      return {
        type:      p.type,
        player:    p.player,
        minute:    p.minute,
        team_side: p.team_side,
      };
    });
  }

  try {
    const response = await channel.send({
      type:    'broadcast',
      event:   'match-update',
      payload,
    });

    if (response === 'ok') {
      logger.info(
        `[Realtime Broadcaster] Sent update for match ${matchId} | ` +
        `diff: ${JSON.stringify(stateDiff)} | events: ${newEvents.length}`
      );
    } else {
      logger.warn(`[Realtime Broadcaster] Broadcast returned: ${response}`);
    }
  } catch (err) {
    logger.error(`[Realtime Broadcaster] Send error for match ${matchId}: ${err.message}`);
  }
}

module.exports = { broadcastMatchUpdate };
