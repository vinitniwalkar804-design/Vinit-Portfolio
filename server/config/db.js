const mongoose = require('mongoose');

function safeUri(uri) {
  return String(uri || '').replace(/\/\/[^@\s/]+@/g, '//<credentials-hidden>@');
}

function safeMessage(msg) {
  return String(msg || '').replace(/\/\/[^@\s/]+@/g, '//<credentials-hidden>@').slice(0, 500);
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';
  const provided = Boolean(process.env.MONGODB_URI);
  console.log(
    `[DB] connecting | MONGODB_URI ${provided ? 'set in env' : 'NOT set (using local fallback)'} | target=${safeUri(uri)}`
  );
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    const cause = err && err.cause ? err.cause : null;
    console.error(
      `[DB] MongoDB connection FAILED | name=${err && err.name ? err.name : 'unknown'} | ` +
        `code=${err && err.code != null ? err.code : 'n/a'} | causeCode=${cause && cause.code != null ? cause.code : 'n/a'} | ` +
        `message=${safeMessage(err && err.message)}`
    );
    throw err;
  }
};

module.exports = connectDB;