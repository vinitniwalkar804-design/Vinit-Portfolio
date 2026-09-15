const mongoose = require('mongoose');
const { getConnection, safeMessage } = require('../config/db');

async function isDbConnected(req, res, next) {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  const err = await getConnection().catch((e) => e || new Error('unknown'));

  if (err) {
    const detail = safeMessage(err && err.message);
    console.warn(
      `[DB] request to ${req.method} ${req.originalUrl} | connection attempt rejected after waiting ` +
        `(name=${err && err.name ? err.name : 'unknown'}, code=${err && err.code != null ? err.code : 'n/a'}` +
        `${detail ? `, message=${detail}` : ''}) | returning 503`
    );
    return res
      .status(503)
      .json({
        success: false,
        message: 'Database is currently unavailable. Please try again later.',
        detail: detail || null
      });
  }

  if (mongoose.connection.readyState !== 1) {
    console.warn(
      `[DB] request to ${req.method} ${req.originalUrl} | still not connected after waiting (readyState=${mongoose.connection.readyState}) | returning 503`
    );
    return res
      .status(503)
      .json({ success: false, message: 'Database is currently unavailable. Please try again later.' });
  }

  next();
}

module.exports = { isDbConnected };