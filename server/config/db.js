const mongoose = require('mongoose');

function safeUri(uri) {
  return String(uri || '').replace(/\/\/[^@\s/]+@/g, '//<credentials-hidden>@');
}

function safeMessage(msg) {
  return String(msg || '').replace(/\/\/[^@\s/]+@/g, '//<credentials-hidden>@').slice(0, 500);
}

const FALLBACK_URI = 'mongodb://localhost:27017/portfolio';
// Atlas SRV handshake from a serverless cold start can exceed 5s. Keep a single
// bounded timeout (overridable via env) so requests wait instead of failing at once.
const SERVER_SELECTION_TIMEOUT_MS =
  Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 10000;

let connectPromise = null;

function attemptConnect() {
  const uri = process.env.MONGODB_URI || FALLBACK_URI;
  const provided = Boolean(process.env.MONGODB_URI);
  console.log(
    `[DB] connecting | MONGODB_URI ${provided ? 'set in env' : 'NOT set (using local fallback)'} | ` +
      `target=${safeUri(uri)} | serverSelectionTimeoutMS=${SERVER_SELECTION_TIMEOUT_MS}`
  );
  return mongoose
    .connect(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS })
    .then((conn) => {
      connectPromise = null;
      console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    })
    .catch((err) => {
      connectPromise = null; // clear so the next caller can retry
      const cause = err && err.cause ? err.cause : null;
      console.error(
        `[DB] MongoDB connection FAILED | name=${err && err.name ? err.name : 'unknown'} | ` +
          `code=${err && err.code != null ? err.code : 'n/a'} | causeCode=${cause && cause.code != null ? cause.code : 'n/a'} | ` +
          `message=${safeMessage(err && err.message)} | will retry on next request`
      );
      throw err;
    });
}

// Shared connection: concurrent callers await the in-flight attempt; a failure
// is cleared so the next request automatically retries.
function getConnection() {
  if (mongoose.connection.readyState === 1) {
    connectPromise = null;
    return Promise.resolve();
  }
  if (!connectPromise) {
    connectPromise = attemptConnect();
  }
  return connectPromise;
}

const connectDB = () => getConnection();

module.exports = connectDB;
module.exports.getConnection = getConnection;