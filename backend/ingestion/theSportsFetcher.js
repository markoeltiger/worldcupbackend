'use strict';

const axios = require('axios');
const cache = require('../utils/cache');
const retry = require('../utils/retry');
const logger = require('../utils/logger');

const API_BASE_URL = 'https://api.thesports.com/v1/football';
const THESPORTS_USER = process.env.THESPORTS_USER || '';
const THESPORTS_SECRET = process.env.THESPORTS_SECRET || '';

/**
 * Fetch matches/fixtures from TheSports API with caching layer.
 * Returns empty array or throws error if credentials are unconfigured or API fails.
 */
async function fetchMatches() {
  const cacheKey = 'thesports:matches';
  
  return cache.getOrSet(cacheKey, async () => {
    const isUnconfigured = !THESPORTS_USER || !THESPORTS_SECRET || 
                          THESPORTS_USER.includes('your-') || 
                          THESPORTS_SECRET.includes('your-');
                   
    if (isUnconfigured) {
      logger.warn('[TheSports API] No valid credentials configured. Ingestion skipped for this provider.');
      return [];
    }

    logger.info('[TheSports API] Cache miss. Fetching live matches from API endpoint.');
    
    try {
      const res = await retry.withRetry(() => axios.get(`${API_BASE_URL}/match/live`, {
        params: {
          user: THESPORTS_USER,
          secret: THESPORTS_SECRET
        },
        timeout: 5000
      }), { label: 'thesports live matches' });
      
      const data = res.data?.results || res.data?.data;
      if (!data) {
        throw new Error('Malformed response from TheSports API (no results/data fields found)');
      }
      return data;
    } catch (err) {
      logger.error(`[TheSports API] Live request failed: ${err.message}`);
      throw err;
    }
  }, 10); // 10 seconds TTL for fast live score refresh
}

module.exports = {
  fetchMatches
};
