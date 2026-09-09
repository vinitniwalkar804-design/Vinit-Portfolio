const mongoose = require('mongoose');

function isDbConnected(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res
      .status(503)
      .json({ success: false, message: 'Database is currently unavailable. Please try again later.' });
  }
  next();
}

module.exports = { isDbConnected };