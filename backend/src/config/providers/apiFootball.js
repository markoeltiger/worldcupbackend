'use strict';

/**
 * src/config/providers/apiFootball.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized API-Football v3 provider configuration.
 * 
 * Features:
 * - Axios instance with proper headers
 * - Automatic retry on 429 (rate limit) and 5xx errors
 * - Exponential backoff
 * - Daily quota tracking and management
 * - Circuit breaker integration
 * - Request deduplication
 */

const axios = require('axios');
const logger = require('../../../utils/logger');

const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY || '32620cdc58ececdce255ba5827f01919';

// Daily quota tracking (resets at midnight)
let dailyCallCount = 0;
let lastResetDate = new Date().toDateString();
const DAILY_LIMIT = 500; // Target < 500 requests/day for cost optimization

// Circuit breaker state
let circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
let circuitFailureCount = 0;
let circuitLastFailureTime = null;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_TIMEOUT_MS = 60000; // 1 minute cooldown

// Request deduplication cache (in-memory for short-lived dedup)
const pendingRequests = new Map();

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyCallCount = 0;
    lastResetDate = today;
    logger.info('[API-Football] Daily call counter reset.');
  }
}

function checkDailyLimit() {
  resetDailyCounterIfNeeded();
  if (dailyCallCount >= DAILY_LIMIT) {
    const err = new Error(`[API-Football] Daily quota limit reached (${DAILY_LIMIT} calls).`);
    err.code = 'PROVIDER_QUOTA_EXCEEDED';
    throw err;
  }
}

function checkCircuitBreaker() {
  if (circuitState === 'OPEN') {
    const timeSinceFailure = Date.now() - circuitLastFailureTime;
    if (timeSinceFailure > CIRCUIT_RESET_TIMEOUT_MS) {
      circuitState = 'HALF_OPEN';
      logger.info('[API-Football] Circuit breaker transitioning to HALF_OPEN');
    } else {
      const err = new Error('[API-Football] Circuit breaker is OPEN. Rejecting request.');
      err.code = 'CIRCUIT_BREAKER_OPEN';
      throw err;
    }
  }
}

function recordCircuitSuccess() {
  circuitFailureCount = 0;
  if (circuitState === 'HALF_OPEN') {
    circuitState = 'CLOSED';
    logger.info('[API-Football] Circuit breaker reset to CLOSED');
  }
}

function recordCircuitFailure() {
  circuitFailureCount++;
  circuitLastFailureTime = Date.now();
  if (circuitFailureCount >= CIRCUIT_FAILURE_THRESHOLD) {
    circuitState = 'OPEN';
    logger.error(`[API-Football] Circuit breaker opened after ${circuitFailureCount} failures`);
  }
}

// Sleep function for exponential backoff
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'x-apisports-key': API_KEY,
    'Content-Type': 'application/json',
  },
});

/**
 * Execute API request with retry logic, circuit breaker, and quota management
 */
async function executeRequest(endpoint, params = {}, options = {}) {
  const { retries = 3, baseDelayMs = 1000 } = options;
  
  // Check circuit breaker before attempting request
  checkCircuitBreaker();
  
  // Check daily quota
  checkDailyLimit();
  
  // Request deduplication
  const requestKey = `${endpoint}:${JSON.stringify(params)}`;
  if (pendingRequests.has(requestKey)) {
    logger.debug(`[API-Football] Request deduped: ${requestKey}`);
    return pendingRequests.get(requestKey);
  }

  const requestPromise = (async () => {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axiosInstance.get(endpoint, { params });
        
        // Increment daily call counter on success
        dailyCallCount++;
        logger.debug(`[API-Football] ${endpoint} | calls today: ${dailyCallCount}/${DAILY_LIMIT}`);
        
        // Record circuit breaker success
        recordCircuitSuccess();
        
        // Check for API-Football error responses (they return 200 OK with errors in body)
        const errors = response.data?.errors;
        if (errors) {
          const hasErrors = Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0;
          
          if (hasErrors) {
            const detail = JSON.stringify(errors);
            
            let code = 'PROVIDER_API_ERROR';
            if (detail.toLowerCase().includes('quota') || detail.toLowerCase().includes('limit')) {
              code = 'PROVIDER_QUOTA_EXCEEDED';
            } else if (detail.toLowerCase().includes('token') || detail.toLowerCase().includes('key')) {
              code = 'PROVIDER_INVALID_KEY';
            }
            
            const err = new Error(`[API-Football] API error: ${detail}`);
            err.code = code;
            throw err;
          }
        }
        
        return response.data?.response || [];
      } catch (err) {
        lastError = err;
        
        // Don't retry on certain errors
        if (err.code === 'PROVIDER_INVALID_KEY' || err.code === 'CIRCUIT_BREAKER_OPEN') {
          throw err;
        }
        
        // Retry on 429 (rate limit) and 5xx errors
        const shouldRetry = 
          err.response?.status === 429 ||
          (err.response?.status >= 500 && err.response?.status < 600) ||
          err.code === 'ECONNABORTED' ||
          err.code === 'ETIMEDOUT';
        
        if (!shouldRetry || attempt === retries) {
          recordCircuitFailure();
          throw err;
        }
        
        // Exponential backoff
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn(`[API-Football] Retry ${attempt + 1}/${retries} after ${delay}ms for ${endpoint}: ${err.message}`);
        await sleep(delay);
      }
    }
    
    throw lastError;
  })();

  pendingRequests.set(requestKey, requestPromise);
  
  try {
    const result = await requestPromise;
    return result;
  } finally {
    pendingRequests.delete(requestKey);
  }
}

/**
 * Get provider health metrics
 */
function getHealthMetrics() {
  resetDailyCounterIfNeeded();
  
  return {
    provider: 'api-football',
    status: circuitState === 'OPEN' ? 'unhealthy' : 'healthy',
    circuitState,
    circuitFailureCount,
    dailyCallCount,
    dailyLimit: DAILY_LIMIT,
    dailyRemaining: DAILY_LIMIT - dailyCallCount,
    lastResetDate,
    baseUrl: BASE_URL,
  };
}

module.exports = {
  executeRequest,
  getHealthMetrics,
  BASE_URL,
  API_KEY,
};
