'use strict';

/**
 * theSportsFetcher.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Primary data provider: TheSports.com football API
 *
 * PRODUCTION RULES:
 * - If credentials are missing/invalid → THROW (activates failover chain)
 * - If API call fails → THROW (activates failover chain)
 * - NEVER return mock/fake/empty data silently
 * - NEVER swallow errors
 */

const axios   = require('axios');
const cache   = require('../utils/cache');
const { withRetry } = require('../utils/retry');
const logger  = require('../utils/logger');

const API_BASE_URL      = 'https://api.thesports.com/v1/football';
const THESPORTS_USER    = process.env.THESPORTS_USER   || '';
const THESPORTS_SECRET  = process.env.THESPORTS_SECRET || '';

// Placeholder patterns that mean "not actually configured"
const PLACEHOLDER_PATTERNS = ['your-', 'placeholder', 'changeme', 'example', 'xxx'];

function isPlaceholder(value) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => lower.includes(p));
}

/**
 * Fetch live matches from TheSports API.
 *
 * @throws {Error} ProviderUnconfiguredError — if credentials are missing/placeholder
 * @throws {Error} Provider API error — if the API call fails
 * @returns {Promise<Array>} Raw match array from TheSports API
 */
async function fetchMatches() {
  // ─── Credential Guard ────────────────────────────────────────────────────
  if (isPlaceholder(THESPORTS_USER) || isPlaceholder(THESPORTS_SECRET)) {
    const err = new Error('[TheSports] Credentials not configured — skipping this provider');
    err.code = 'PROVIDER_UNCONFIGURED';
    throw err;
  }

  const cacheKey = 'thesports:live_matches';

  return cache.getOrSet(cacheKey, async () => {
    logger.info('[TheSports] Fetching live matches from API');

    const res = await withRetry(
      () => axios.get(`${API_BASE_URL}/match/live`, {
        params:  { user: THESPORTS_USER, secret: THESPORTS_SECRET },
        timeout: 8000,
      }),
      { retries: 2, baseDelayMs: 1500, label: 'thesports:live' }
    );

    // TheSports may return success=0 or an error body
    if (res.data?.code && res.data.code !== 0) {
      const apiErr = new Error(`[TheSports] API error code ${res.data.code}: ${res.data.msg || 'unknown'}`);
      apiErr.code = 'PROVIDER_API_ERROR';
      throw apiErr;
    }

    const data = res.data?.results || res.data?.data;
    if (!Array.isArray(data)) {
      const malformed = new Error('[TheSports] Malformed API response — no results/data array');
      malformed.code = 'PROVIDER_MALFORMED_RESPONSE';
      throw malformed;
    }

    logger.info(`[TheSports] Fetched ${data.length} live matches`);
    return data;
  }, 10); // 10s TTL for live data
}

module.exports = { fetchMatches };
