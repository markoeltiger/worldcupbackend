'use strict';

const logger = require('../utils/logger');

// Circuit states
const STATES = {
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Cooldown active, fallback active
  HALF_OPEN: 'HALF_OPEN'  // Testing recovery
};

// Default priority order
const PROVIDER_ORDER = ['football_data', 'api_football', 'sportsdb', 'scraper'];

// Health database in-memory state
const healthState = {
  football_data: createProviderState('football_data'),
  api_football: createProviderState('api_football'),
  sportsdb: createProviderState('sportsdb'),
  scraper: createProviderState('scraper')
};

// Threshold configurations
const FAILURE_THRESHOLD = 3;            // Consec failures before circuit OPEN
const COOLDOWN_DURATION_MS = 300000;    // 5 minutes cooldown (5 * 60 * 1000)
const HALF_OPEN_SUCCESSES_REQUIRED = 2; // Successes in HALF_OPEN before returning to CLOSED

function createProviderState(name) {
  return {
    name,
    state: STATES.CLOSED,
    failureCount: 0,
    successCount: 0,
    consecutiveSuccessCount: 0,
    totalRequests: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    latencyHistory: [], // sliding window of last 10 requests
    lastSuccessTimestamp: null,
    cooldownUntil: 0
  };
}

/**
 * Record a successful execution.
 *
 * @param {string} providerName
 * @param {number} latencyMs
 */
function recordSuccess(providerName, latencyMs) {
  const p = healthState[providerName];
  if (!p) return;

  p.totalRequests++;
  p.totalSuccesses++;
  p.failureCount = 0;
  p.lastSuccessTimestamp = Date.now();

  // Sliding latency average (limit history to 10 entries)
  p.latencyHistory.push(latencyMs);
  if (p.latencyHistory.length > 10) {
    p.latencyHistory.shift();
  }

  if (p.state === STATES.OPEN) {
    // If it was OPEN, make it HALF_OPEN
    p.state = STATES.HALF_OPEN;
    p.consecutiveSuccessCount = 1;
    logger.info(`[Health Manager] Provider ${providerName} moved to HALF_OPEN status.`);
  } else if (p.state === STATES.HALF_OPEN) {
    p.consecutiveSuccessCount++;
    if (p.consecutiveSuccessCount >= HALF_OPEN_SUCCESSES_REQUIRED) {
      p.state = STATES.CLOSED;
      p.consecutiveSuccessCount = 0;
      p.failureCount = 0; // Reset consecutive failures to allow fresh error thresholds
      logger.info(`[Health Manager] Provider ${providerName} fully recovered to CLOSED (active).`);
    }
  }
}

/**
 * Record a failure execution.
 *
 * @param {string} providerName
 */
function recordFailure(providerName) {
  const p = healthState[providerName];
  if (!p) return;

  p.totalRequests++;
  p.totalFailures++;
  p.failureCount++;
  p.consecutiveSuccessCount = 0;

  logger.warn(`[Health Manager] Provider ${providerName} reported failure (attempt ${p.failureCount}/${FAILURE_THRESHOLD}).`);

  if (p.state === STATES.CLOSED && p.failureCount >= FAILURE_THRESHOLD) {
    p.state = STATES.OPEN;
    p.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
    logger.error(`[Health Manager] Circuit breaker OPENED for ${providerName}. Cooldown active for 5m.`);
  } else if (p.state === STATES.HALF_OPEN) {
    // Instantly reopen if it fails in HALF_OPEN
    p.state = STATES.OPEN;
    p.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
    logger.error(`[Health Manager] Circuit breaker REOPENED for ${providerName} during recovery test.`);
  }
}

/**
 * Evaluates provider health and returns the highest priority active provider.
 * Handles circuit breaker state transitions (OPEN -> HALF_OPEN).
 *
 * @returns {string} Name of active provider to use
 */
function getActiveProvider() {
  const now = Date.now();

  for (const name of PROVIDER_ORDER) {
    const p = healthState[name];
    if (!p) continue;

    // Check if cooldown has elapsed while in OPEN state
    if (p.state === STATES.OPEN && now >= p.cooldownUntil) {
      p.state = STATES.HALF_OPEN;
      p.consecutiveSuccessCount = 0;
      logger.info(`[Health Manager] Cooldown elapsed. Testing ${name} in HALF_OPEN state.`);
    }

    // Skip if circuit is currently open
    if (p.state === STATES.OPEN) {
      logger.debug(`[Health Manager] Skipping OPEN provider: ${name}`);
      continue;
    }

    return name;
  }

  // Scraper is the ultimate catch-all fallback
  return 'scraper';
}

/**
 * Calculates a dynamic health score from 0 to 100 for a provider.
 *
 * @param {string} providerName
 * @returns {number} Score
 */
function getProviderScore(providerName) {
  const p = healthState[providerName];
  if (!p) return 0;

  if (p.state === STATES.OPEN) return 0;
  if (p.state === STATES.HALF_OPEN) return 50;

  // CLOSED state calculations
  const failurePenalty = p.failureCount * 25;
  const avgLatency = getAverageLatency(providerName);
  const latencyPenalty = avgLatency > 2000 ? 15 : avgLatency > 1000 ? 5 : 0;

  return Math.max(10, 100 - failurePenalty - latencyPenalty);
}

function getAverageLatency(providerName) {
  const p = healthState[providerName];
  if (!p || p.latencyHistory.length === 0) return 0;
  const sum = p.latencyHistory.reduce((a, b) => a + b, 0);
  return Math.round(sum / p.latencyHistory.length);
}

/**
 * Returns complete observability metrics for all providers.
 *
 * @returns {object}
 */
function getMetrics() {
  const metrics = {};
  const now = Date.now();
  for (const name of PROVIDER_ORDER) {
    const p = healthState[name];

    // Check and transition expired OPEN circuits to HALF_OPEN for real-time telemetry accuracy
    if (p.state === STATES.OPEN && now >= p.cooldownUntil) {
      p.state = STATES.HALF_OPEN;
      p.consecutiveSuccessCount = 0;
      logger.info(`[Health Manager] Cooldown elapsed. Testing ${name} in HALF_OPEN state (via metrics).`);
    }

    metrics[name] = {
      state: p.state,
      failureCount: p.failureCount,
      consecutiveSuccessCount: p.consecutiveSuccessCount,
      score: getProviderScore(name),
      averageLatencyMs: getAverageLatency(name),
      totalRequests: p.totalRequests,
      totalSuccesses: p.totalSuccesses,
      totalFailures: p.totalFailures,
      lastSuccess: p.lastSuccessTimestamp ? new Date(p.lastSuccessTimestamp).toISOString() : null,
      cooldownRemainingMs: p.state === STATES.OPEN ? Math.max(0, p.cooldownUntil - Date.now()) : 0
    };
  }
  return metrics;
}

module.exports = {
  STATES,
  recordSuccess,
  recordFailure,
  getActiveProvider,
  getProviderScore,
  getMetrics
};
