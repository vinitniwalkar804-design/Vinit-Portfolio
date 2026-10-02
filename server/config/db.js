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

// A serverless cold start can connect and then settle on readyState !== 1 (or
// fail the Atlas handshake outright). Without a retry the very first request of
// a cold instance answers 503 even though the next request succeeds moments
// later, which surfaces as a failed admin login. Retry a couple of times with a
// short backoff so a transient handshake hiccup is ridden out.
const CONNECT_RETRIES = Number(process.env.MONGODB_CONNECT_RETRIES) || 2;
const CONNECT_RETRY_DELAY_MS = Number(process.env.MONGODB_CONNECT_RETRY_DELAY_MS) || 400;

let connectPromise = null;

async function attemptConnect() {
  const uri = process.env.MONGODB_URI || FALLBACK_URI;
  const provided = Boolean(process.env.MONGODB_URI);
  console.log(
    `[DB] connecting | MONGODB_URI ${provided ? 'set in env' : 'NOT set (using local fallback)'} | ` +
      `target=${safeUri(uri)} | serverSelectionTimeoutMS=${SERVER_SELECTION_TIMEOUT_MS}`
  );
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS
    });
    // mongoose.connect() can resolve before the mongoose connection is fully
    // "connected" (readyState flips to 1 a tick later). Wait for the real
    // connected state so callers only proceed once queries can actually run.
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connection.asPromise();
    }
    connectPromise = null;
    console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    connectPromise = null; // clear so the next caller can retry
    const cause = err && err.cause ? err.cause : null;
    console.error(
      `[DB] MongoDB connection FAILED | name=${err && err.name ? err.name : 'unknown'} | ` +
        `code=${err && err.code != null ? err.code : 'n/a'} | causeCode=${cause && cause.code != null ? cause.code : 'n/a'} | ` +
        `message=${safeMessage(err && err.message)} | will retry on next request`
    );
    throw err;
  }
}

// Shared connection: all callers await the SAME in-flight attempt (safe under
// concurrent serverless invocations on one instance). The returned promise only
// settles once mongoose is actually connected (readyState === 1). Transient
// failures are retried with a short backoff before giving up, and a failed
// attempt is cleared so the next request automatically retries.
function getConnection() {
  if (mongoose.connection.readyState === 1) {
    connectPromise = null;
    return Promise.resolve();
  }
  if (!connectPromise) {
    connectPromise = ensureConnected();
  }
  return connectPromise;
}

// Resolves only once readyState === 1. Retries while the connection either
// throws or settles on a non-connected readyState.
async function ensureConnected() {
  const total = 1 + CONNECT_RETRIES;
  let lastErr = null;

  for (let attempt = 1; attempt <= total; attempt++) {
    if (mongoose.connection.readyState === 1) return;
    try {
      await attemptConnect();
    } catch (err) {
      lastErr = err;
    }
    if (mongoose.connection.readyState === 1) return;
    if (attempt < total) {
      console.warn(
        `[DB] not connected after attempt ${attempt}/${total} (readyState=${mongoose.connection.readyState}` +
          `${lastErr ? `, error=${safeMessage(lastErr && lastErr.message)}` : ''}) - retrying in ` +
          `${CONNECT_RETRY_DELAY_MS * attempt}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS * attempt));
    }
  }

  connectPromise = null; // clear so the next request tries again
  if (lastErr) throw lastErr;
}

const connectDB = () => getConnection();

module.exports = connectDB;
module.exports.getConnection = getConnection;
module.exports.safeMessage = safeMessage;