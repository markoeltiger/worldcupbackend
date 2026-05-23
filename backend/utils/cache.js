'use strict';

/**
 * Unified cache layer.
 * Tries Redis first; falls back to in-process NodeCache.
 * This keeps the MVP deployable on free-tier Render (no Redis addon needed).
 */

const NodeCache = require('node-cache');
const logger = require('./logger');

const localCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

let redisClient = null;

async function initRedis() {
  if (!process.env.REDIS_URL) {
    logger.info('No REDIS_URL set — using in-process NodeCache');
    return;
  }
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      enableReadyCheck: true,
    });

    // Wait for the ready event or fail fast
    await new Promise((resolve, reject) => {
      redisClient.once('ready', resolve);
      redisClient.once('error', reject);
      setTimeout(() => reject(new Error('Redis connect timeout')), 6000);
    });

    logger.info('✓ Redis cache connected');
  } catch (err) {
    logger.warn(`Redis unavailable, falling back to in-process cache: ${err.message}`);
    if (redisClient) {
      try { redisClient.disconnect(); } catch (_) {}
    }
    redisClient = null;
  }
}

/**
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 */
async function set(key, value, ttlSeconds = 60) {
  const serialized = JSON.stringify(value);
  if (redisClient) {
    await redisClient.set(key, serialized, 'EX', ttlSeconds);
  } else {
    localCache.set(key, serialized, ttlSeconds);
  }
}

/**
 * @param {string} key
 * @returns {any|null}
 */
async function get(key) {
  let raw;
  if (redisClient) {
    raw = await redisClient.get(key);
  } else {
    raw = localCache.get(key);
  }
  return raw ? JSON.parse(raw) : null;
}

async function del(key) {
  if (redisClient) await redisClient.del(key);
  else localCache.del(key);
}

async function flush() {
  if (redisClient) await redisClient.flushdb();
  else localCache.flushAll();
}

/**
 * Cache-aside helper: checks cache, runs loader on miss, caches result.
 */
async function getOrSet(key, loaderFn, ttlSeconds = 60) {
  const cached = await get(key);
  if (cached !== null) return cached;
  const fresh = await loaderFn();
  await set(key, fresh, ttlSeconds);
  return fresh;
}

module.exports = { initRedis, set, get, del, flush, getOrSet };
