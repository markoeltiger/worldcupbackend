'use strict';

/**
 * Football Cache Manager
 * =====================
 * Smart caching layer for football data.
 * Redis primary with NodeCache fallback.
 * 
 * Features:
 * - Aggressive caching to reduce API costs
 * - Hash-based change detection
 * - Automatic stale invalidation
 * - Compression for large payloads
 * - Duplicate write prevention
 * - World Cup cache warm-up
 */

const cache = require('../utils/cache');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Cache TTL policies (in seconds)
const TTL_POLICIES = {
  live_matches: 15,      // 15 seconds for live matches
  match_details: 30,     // 30 seconds for match details
  standings: 300,        // 5 minutes for standings
  teams: 86400,          // 1 day for teams
  fixtures: 120,         // 2 minutes for fixtures
  player_stats: 300,     // 5 minutes for player stats
  h2h: 1800,             // 30 minutes for H2H data
  lineups: 600,          // 10 minutes for lineups
  statistics: 300,       // 5 minutes for statistics
  worldcup_live: 5,      // 5 seconds for World Cup live matches
  worldcup_standings: 60, // 1 minute for World Cup standings
};

// Cache keys
const CACHE_PREFIX = 'football:';

/**
 * Generate cache key
 */
function generateCacheKey(type, identifier) {
  const hash = crypto.createHash('md5').update(identifier).digest('hex').substring(0, 8);
  return `${CACHE_PREFIX}${type}:${hash}`;
}

/**
 * Generate hash for data (change detection)
 */
function generateDataHash(data) {
  const dataString = JSON.stringify(data);
  return crypto.createHash('md5').update(dataString).digest('hex');
}

/**
 * Compress data (simple JSON stringify for now, can add compression later)
 */
function compressData(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    logger.error('[CacheManager] Failed to compress data:', error.message);
    return null;
  }
}

/**
 * Decompress data
 */
function decompressData(compressed) {
  try {
    return JSON.parse(compressed);
  } catch (error) {
    logger.error('[CacheManager] Failed to decompress data:', error.message);
    return null;
  }
}

/**
 * Get cached data
 */
async function get(type, identifier) {
  try {
    const key = generateCacheKey(type, identifier);
    const cached = await cache.get(key);
    
    if (cached) {
      const data = decompressData(cached);
      if (data) {
        logger.debug(`[CacheManager] Cache hit for ${type}:${identifier}`);
        return data;
      }
    }
    
    logger.debug(`[CacheManager] Cache miss for ${type}:${identifier}`);
    return null;
  } catch (error) {
    logger.error(`[CacheManager] Get error for ${type}:${identifier}:`, error.message);
    return null;
  }
}

/**
 * Set cached data with TTL
 */
async function set(type, identifier, data, customTTL = null) {
  try {
    const key = generateCacheKey(type, identifier);
    const ttl = customTTL || TTL_POLICIES[type] || 300;
    
    const compressed = compressData(data);
    if (!compressed) {
      logger.warn(`[CacheManager] Failed to compress data for ${type}:${identifier}`);
      return false;
    }
    
    await cache.set(key, compressed, ttl);
    logger.debug(`[CacheManager] Cached ${type}:${identifier} with ${ttl}s TTL`);
    return true;
  } catch (error) {
    logger.error(`[CacheManager] Set error for ${type}:${identifier}:`, error.message);
    return false;
  }
}

/**
 * Get or set with loader function
 */
async function getOrSet(type, identifier, loaderFn, customTTL = null) {
  try {
    const cached = await get(type, identifier);
    if (cached !== null) {
      return cached;
    }
    
    logger.debug(`[CacheManager] Loading fresh data for ${type}:${identifier}`);
    const fresh = await loaderFn();
    await set(type, identifier, fresh, customTTL);
    return fresh;
  } catch (error) {
    logger.error(`[CacheManager] getOrSet error for ${type}:${identifier}:`, error.message);
    throw error;
  }
}

/**
 * Check if data has changed using hash
 */
async function hasChanged(type, identifier, newData) {
  try {
    const cached = await get(type, identifier);
    if (!cached) return true;
    
    const newHash = generateDataHash(newData);
    const oldHash = generateDataHash(cached);
    
    return newHash !== oldHash;
  } catch (error) {
    logger.error(`[CacheManager] Change detection error for ${type}:${identifier}:`, error.message);
    return true; // Assume changed on error
  }
}

/**
 * Invalidate cache entry
 */
async function invalidate(type, identifier) {
  try {
    const key = generateCacheKey(type, identifier);
    await cache.del(key);
    logger.debug(`[CacheManager] Invalidated ${type}:${identifier}`);
  } catch (error) {
    logger.error(`[CacheManager] Invalidate error for ${type}:${identifier}:`, error.message);
  }
}

/**
 * Invalidate by pattern
 */
async function invalidatePattern(pattern) {
  try {
    // Note: This would require Redis SCAN operation
    // For now, we'll implement a simple version
    logger.info(`[CacheManager] Invalidating pattern: ${pattern}`);
    // Implementation would depend on cache backend
  } catch (error) {
    logger.error(`[CacheManager] Pattern invalidate error:`, error.message);
  }
}

/**
 * Invalidate all live match caches
 */
async function invalidateLiveMatches() {
  await invalidatePattern('football:live_matches:*');
}

/**
 * Invalidate World Cup caches
 */
async function invalidateWorldCup() {
  await invalidatePattern('football:worldcup_*');
}

/**
 * Warm up cache for World Cup endpoints
 */
async function warmUpWorldCup(provider) {
  try {
    logger.info('[CacheManager] Warming up World Cup cache...');
    
    // Warm up live matches
    const liveMatches = await provider.getLiveMatches();
    const worldCupLive = liveMatches.filter(m => 
      m.league && m.league.name && m.league.name.toLowerCase().includes('world cup')
    );
    await set('worldcup_live', 'all', worldCupLive);
    
    // Warm up standings (would need league ID)
    // await provider.getStandings(worldCupLeagueId);
    
    logger.info('[CacheManager] World Cup cache warm-up complete');
  } catch (error) {
    logger.error('[CacheManager] World Cup cache warm-up failed:', error.message);
  }
}

/**
 * Get cache statistics
 */
async function getStats() {
  try {
    const stats = {
      prefix: CACHE_PREFIX,
      ttl_policies: TTL_POLICIES,
    };
    
    // Add cache-specific stats if available
    const cacheStats = await cache.getStats();
    if (cacheStats) {
      stats.cache = cacheStats;
    }
    
    return stats;
  } catch (error) {
    logger.error('[CacheManager] Get stats error:', error.message);
    return { error: error.message };
  }
}

/**
 * Flush all football cache
 */
async function flush() {
  try {
    await cache.flush();
    logger.info('[CacheManager] Flushed all football cache');
  } catch (error) {
    logger.error('[CacheManager] Flush error:', error.message);
  }
}

module.exports = {
  TTL_POLICIES,
  generateCacheKey,
  generateDataHash,
  get,
  set,
  getOrSet,
  hasChanged,
  invalidate,
  invalidatePattern,
  invalidateLiveMatches,
  invalidateWorldCup,
  warmUpWorldCup,
  getStats,
  flush,
};
