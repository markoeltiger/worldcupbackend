'use strict';

const crypto = require('crypto');
const idempotency = require('./idempotencyService');

/**
 * Compares old match state vs new match state and extracts fine-grained change events.
 *
 * @param {string} matchId
 * @param {object} oldState - Previous state representation (e.g. database row or cached state)
 * @param {object} newState - Newly ingested match payload
 * @param {string} provider - Provider key (e.g. 'football_data', 'api_football')
 * @returns {Array<object>} List of generated events
 */
function diffMatchStates(matchId, oldState, newState, provider = 'system') {
  const events = [];
  if (!newState) return events;

  // If there's no oldState (i.e., first-time ingest), treat as a bulk init or status update
  const old = oldState || {
    home_score: 0,
    away_score: 0,
    status: 'NS',
    minute: 0,
    events: []
  };

  // 1. Detect Status Change
  if (newState.status !== undefined && newState.status !== old.status) {
    const signature = `${matchId}:STATUS_CHANGE:${old.status}:${newState.status}`;
    const hash = crypto.createHash('md5').update(signature).digest('hex');
    events.push({
      type: 'STATUS_CHANGE',
      match_id: matchId,
      payload: {
        previous_status: old.status,
        current_status: newState.status
      },
      hash
    });
  }

  // 2. Detect Score Change
  const oldHomeScore = parseInt(old.home_score, 10) || 0;
  const oldAwayScore = parseInt(old.away_score, 10) || 0;
  const newHomeScore = parseInt(newState.home_score, 10) || 0;
  const newAwayScore = parseInt(newState.away_score, 10) || 0;

  if (newHomeScore !== oldHomeScore || newAwayScore !== oldAwayScore) {
    const signature = `${matchId}:SCORE_CHANGE:${oldHomeScore}-${oldAwayScore}:${newHomeScore}-${newAwayScore}`;
    const hash = crypto.createHash('md5').update(signature).digest('hex');
    events.push({
      type: 'SCORE_CHANGE',
      match_id: matchId,
      payload: {
        previous_home_score: oldHomeScore,
        previous_away_score: oldAwayScore,
        current_home_score: newHomeScore,
        current_away_score: newAwayScore
      },
      hash
    });
  }

  // 3. Detect Minute Update
  const oldMin = parseInt(old.minute, 10) || 0;
  const newMin = parseInt(newState.minute, 10) || 0;

  if (newMin !== oldMin && newMin > 0) {
    const signature = `${matchId}:MINUTE_UPDATE:${oldMin}:${newMin}`;
    const hash = crypto.createHash('md5').update(signature).digest('hex');
    events.push({
      type: 'MINUTE_UPDATE',
      match_id: matchId,
      payload: {
        previous_minute: oldMin,
        current_minute: newMin
      },
      hash
    });
  }

  // 4. Detect New Events (goals, cards, substitutions)
  const oldEvents = old.events || [];
  const newEvents = newState.events || [];

  const oldKeys = new Set(
    oldEvents.map(e => idempotency.getEventKey(matchId, e.type, e.minute, e.player, provider))
  );

  newEvents.forEach(e => {
    const evKey = idempotency.getEventKey(matchId, e.type, e.minute, e.player, provider);
    if (!oldKeys.has(evKey)) {
      events.push({
        type: 'NEW_EVENT',
        match_id: matchId,
        payload: {
          type: e.type,
          team_side: e.team_side,
          player: e.player,
          minute: e.minute,
          extra: e.extra || {}
        },
        hash: evKey
      });
    }
  });

  return events;
}

module.exports = {
  diffMatchStates
};
