const mongoose = require('mongoose');

function isDbConnected(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    console.warn(
      `[DB] request to ${req.method} ${req.originalUrl} blocked (503) | mongoose.connection.readyState=${mongoose.connection.readyState} ` +
        `(0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`
    );
    return res
      .status(503)
      .json({ success: false, message: 'Database is currently unavailable. Please try again later.' });
  }
  next();
}

module.exports = { isDbConnected };