'use strict';

const { getClient } = require('../../db/supabase');
const logger = require('../../utils/logger');

let channelInstance = null;

/**
 * Initializes and subscribes to the Supabase Realtime broadcast channel.
 *
 * @returns {object|null} Supabase Channel instance
 */
function getChannel() {
  if (channelInstance) return channelInstance;
  
  try {
    const supabase = getClient();
    channelInstance = supabase.channel('gooly-live-matches', {
      config: {
        broadcast: { self: false, ack: false }
      }
    });
    
    channelInstance.subscribe((status) => {
      logger.info(`[Realtime Broadcaster] Channel subscription status: ${status}`);
    });
    
    return channelInstance;
  } catch (err) {
    logger.error(`[Realtime Broadcaster] Failed to initialize Supabase channel: ${err.message}`);
    return null;
  }
}

/**
 * Broadcasts a compact, real-time match update packet to mobile/web clients.
 * Eliminates redundant database lookups/writes on standard live ticks.
 *
 * @param {string} matchId
 * @param {Array<object>} newEvents - Deduplicated new timeline events
 * @param {object} stateDiff - Object containing home_score, away_score, status, minute
 */
async function broadcastMatchUpdate(matchId, newEvents = [], stateDiff = {}) {
  const channel = getChannel();
  if (!channel) {
    logger.warn('[Realtime Broadcaster] No active channel. Skipping broadcast.');
    return;
  }

  // Format compact update payloads to save bandwidth and parse times on client
  const payload = {
    match_id: matchId,
    home_score: stateDiff.home_score !== undefined ? stateDiff.home_score : null,
    away_score: stateDiff.away_score !== undefined ? stateDiff.away_score : null,
    status: stateDiff.status !== undefined ? stateDiff.status : null,
    minute: stateDiff.minute !== undefined ? stateDiff.minute : null,
    timestamp: new Date().toISOString()
  };

  // If there are new timeline events, include them compactly
  if (newEvents && newEvents.length > 0) {
    payload.events = newEvents.map(e => {
      const p = e.payload || e;
      return {
        type: p.type,
        player: p.player,
        minute: p.minute,
        team_side: p.team_side
      };
    });
  }

  try {
    const response = await channel.send({
      type: 'broadcast',
      event: 'match-update',
      payload
    });
    
    if (response === 'ok') {
      logger.info(`[Realtime Broadcaster] Broadcasted compact update for match ${matchId} | diff: ${JSON.stringify(stateDiff)} | events: ${newEvents.length}`);
    } else {
      logger.warn(`[Realtime Broadcaster] Broadcast failed with status: ${response}`);
    }
  } catch (err) {
    logger.error(`[Realtime Broadcaster] Send error for match ${matchId}: ${err.message}`);
  }
}

module.exports = {
  broadcastMatchUpdate
};
