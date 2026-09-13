const jwt = require('jsonwebtoken');

/**
 * Wrap async route handlers so thrown errors reach Express' error handler.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };