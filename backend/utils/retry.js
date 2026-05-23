'use strict';

const logger = require('./logger');

/**
 * Exponential-backoff retry wrapper.
 *
 * @param {Function} fn          Async function to call
 * @param {object}   opts
 * @param {number}   opts.retries      Max attempts (default 3)
 * @param {number}   opts.baseDelayMs  Initial delay in ms (default 1000)
 * @param {string}   opts.label        Label for log messages
 */
async function withRetry(fn, { retries = 3, baseDelayMs = 1000, label = 'operation' } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(`[Retry] ${label} failed (attempt ${attempt}/${retries}): ${err.message}. Retrying in ${delay}ms`);
      if (attempt < retries) await sleep(delay);
    }
  }
  logger.error(`[Retry] ${label} exhausted all ${retries} retries`);
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { withRetry, sleep };
