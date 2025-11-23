/**
 * Wraps async route handlers to catch errors automatically
 * without needing try-catch in every function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;