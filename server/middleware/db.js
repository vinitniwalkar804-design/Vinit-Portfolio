const mongoose = require('mongoose');
const { getConnection } = require('../config/db');

async function isDbConnected(req, res, next) {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  try {
    await getConnection();
  } catch (err) {
    console.warn(
      `[DB] request to ${req.method} ${req.originalUrl} | connect attempt failed ` +
        `(name=${err && err.name ? err.name : 'unknown'}, code=${err && err.code != null ? err.code : 'n/a'}) | returning 503`
    );
    return res
      .status(503)
      .json({ success: false, message: 'Database is currently unavailable. Please try again later.' });
  }

  if (mongoose.connection.readyState !== 1) {
    console.warn(
      `[DB] request to ${req.method} ${req.originalUrl} | readyState=${mongoose.connection.readyState} after connect attempt | returning 503`
    );
    return res
      .status(503)
      .json({ success: false, message: 'Database is currently unavailable. Please try again later.' });
  }
  next();
}

module.exports = { isDbConnected };