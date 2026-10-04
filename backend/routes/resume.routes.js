const express = require('express');
const { Readable } = require('stream');
const mongoose = require('mongoose');

const storage = require('../config/storage');
const { getConnection } = require('../config/db');

const router = express.Router();

/**
 * How long a public download will wait for a Mongo connection before falling
 * back to the copy bundled with the deployment. Keeps the first request of a
 * cold instance fast instead of stalling the visitor.
 */
const DB_WAIT_MS = Number(process.env.RESUME_DB_WAIT_MS) || 4000;

async function activeRecord() {
  if (mongoose.connection.readyState !== 1) {
    await Promise.race([
      getConnection().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, DB_WAIT_MS))
    ]);
  }
  if (mongoose.connection.readyState !== 1) return null;
  return storage.latestRecord();
}

/**
 * Public resume download.
 *
 * The href in index.html is a fixed, stable path. This route is mounted BEFORE
 * express.static so it always wins over the copy bundled in the deployment:
 *
 *   - durable provider (production) -> streams the active revision from blob
 *   - local provider / no record / blob unreachable -> next(), so
 *     express.static serves frontend/public/assets/Vinit-Niwalkar-Resume.pdf
 *
 * Mounted before static so a bundled file can never shadow the active resume,
 * and responses are no-store so a replace is visible immediately and never
 * served from a stale cache.
 */
router.get(storage.RESUME_URL, async (req, res, next) => {
  let record = null;
  try {
    record = await activeRecord();
  } catch (err) {
    console.warn(`[resume] could not load the active resume record (${err.message})`);
  }

  const storageUrl = record && record.storageProvider === 'vercel-blob' ? record.storageUrl : '';
  if (!storageUrl) return next();

  const upstream = await storage.fetchRemote(storageUrl);
  if (!upstream) {
    // Never leave the visitor with a broken button: fall back to the bundled
    // copy and make the outage obvious in the logs.
    console.warn(
      `[resume] active revision is unreachable in storage; serving the copy bundled with this deployment. url=${storageUrl}`
    );
    return next();
  }

  const length = upstream.headers.get('content-length');
  res.set('Content-Type', storage.MIME);
  res.set('Content-Disposition', `attachment; filename="${storage.RESUME_FILENAME}"`);
  res.set('Cache-Control', 'no-store, must-revalidate');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Vary', 'Accept-Encoding');
  if (length) res.set('Content-Length', length);

  // Express routes HEAD to this handler but must not send a body for it.
  if (req.method === 'HEAD') return res.end();

  try {
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.warn(`[resume] streaming the active resume failed (${err.message})`);
    if (!res.headersSent) res.status(502);
    res.end();
  }
});

module.exports = router;
