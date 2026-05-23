'use strict';

const crypto = require('crypto');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * Generates a deterministic hash representing a unique event key.
 *
 * @param {string} matchId
 * @param {string} type
 * @param {number|string} minute
 * @param {string} player
 * @param {string} provider
 * @returns {string}
 */
function getEventKey(matchId, type, minute, player, provider) {
  const normMatchId = String(matchId || '').trim();
  const normType = String(type || '').toUpperCase().trim();
  const normMin = String(minute !== undefined ? minute : '').trim();
  const normPlayer = String(player || '').toLowerCase().trim();

  // We exclude provider from signature to deduplicate identical events globally across fallback providers
  const signature = `${normMatchId}:${normType}:${normMin}:${normPlayer}`;
  return crypto.createHash('md5').update(signature).digest('hex');
}

/**
 * Checks if an event is duplicate. If not duplicate, caches the key.
 *
 * @param {string} matchId
 * @param {string} type
 * @param {number|string} minute
 * @param {string} player
 * @param {string} provider
 * @param {number} ttlSeconds - Cache TTL in seconds (default 86400s / 24 hours)
 * @returns {Promise<boolean>}
 */
async function checkAndMarkDuplicate(matchId, type, minute, player, provider, ttlSeconds = 86400) {
  const hashKey = getEventKey(matchId, type, minute, player, provider);
  const cacheKey = `idempotency:event:${hashKey}`;

  try {
    const isSeen = await cache.get(cacheKey);
    if (isSeen) {
      logger.debug(`[Deduplication] Blocked duplicate event for match ${matchId}: ${type} min ${minute} by ${player}`);
      return true;
    }

    // Mark as seen
    await cache.set(cacheKey, true, ttlSeconds);
    return false;
  } catch (err) {
    logger.error(`[Deduplication] Error checking idempotency key: ${err.message}`);
    // Safe fallback: do not block event if caching layers fail
    return false;
  }
}

module.exports = {
  getEventKey,
  checkAndMarkDuplicate
};
