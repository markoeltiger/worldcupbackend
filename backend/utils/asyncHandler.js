'use strict';

/**
 * Async request handler wrapper to eliminate boilerplated try/catch blocks
 * in Express controllers/routes and safely forward exceptions to the next handler.
 *
 * @param {Function} fn - Async Express handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
