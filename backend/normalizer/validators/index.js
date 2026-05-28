'use strict';

const logger = require('../../utils/logger');

/**
 * Sanitizes and validates a normalized match payload.
 * Protects database and downstream systems from corrupted provider states (e.g. null scores, wrong minutes).
 *
 * @param {object} match - Normalized match payload
 * @returns {boolean} True if payload is clean and valid, false if rejected/corrupted
 */
function validateNormalizedMatch(match) {
  if (!match) {
    logger.warn('[Live Data Validation] Null match payload rejected.');
    return false;
  }

  // 1. Validate team existence (names must be populated)
  if (!match.home_team || !match.away_team || match.home_team.trim() === '' || match.away_team.trim() === '') {
    logger.warn(`[Live Data Validation] Match rejected: Missing home or away team name (ID: ${match.external_id})`);
    return false;
  }

  // 2. Validate scores consistency
  const homeScore = parseInt(match.home_score, 10);
  const awayScore = parseInt(match.away_score, 10);
  if (homeScore < 0 || awayScore < 0 || isNaN(homeScore) || isNaN(awayScore)) {
    logger.warn(`[Live Data Validation] Match rejected: Invalid negative or non-numeric score values (Home: ${match.home_score}, Away: ${match.away_score}) for match ${match.external_id}`);
    return false;
  }

  // 3. Validate game minute ranges (minutes must lie in standard soccer match limit [0, 130])
  const minute = parseInt(match.minute, 10);
  if (minute < 0 || minute > 130 || isNaN(minute)) {
    logger.warn(`[Live Data Validation] Match rejected: Corrupted game minute range (${match.minute}) for match ${match.external_id}`);
    return false;
  }

  // 4. Validate timestamp parseability
  if (!match.start_time || isNaN(Date.parse(match.start_time))) {
    logger.warn(`[Live Data Validation] Match rejected: Missing or malformed kickoff timestamp (${match.start_time}) for match ${match.external_id}`);
    return false;
  }

  // 5. Validate and deduplicate inline timeline events
  if (match.events && Array.isArray(match.events)) {
    const validEvents = [];
    const eventFingerprints = new Set();

    for (const ev of match.events) {
      // Validate event minute range
      const evMinute = parseInt(ev.minute, 10);
      if (evMinute < 0 || evMinute > 130 || isNaN(evMinute)) {
        logger.warn(`[Live Data Validation] Event rejected: Invalid timeline minute (${ev.minute}) in match ${match.external_id}`);
        continue;
      }

      // Validate event type presence
      if (!ev.type) {
        logger.warn(`[Live Data Validation] Event rejected: Missing type in match ${match.external_id}`);
        continue;
      }

      // Check event duplication inline within same payload (e.g. provider returned same event twice in array)
      const fingerprint = `${ev.type}:${evMinute}:${(ev.player || '').toLowerCase()}:${ev.team_side}`;
      if (eventFingerprints.has(fingerprint)) {
        logger.debug(`[Live Data Validation] Deduplicated duplicate event inside payload: ${fingerprint} for match ${match.external_id}`);
        continue;
      }

      eventFingerprints.add(fingerprint);
      validEvents.push(ev);
    }
    match.events = validEvents;
  }

  return true;
}

module.exports = {
  validateNormalizedMatch
};
