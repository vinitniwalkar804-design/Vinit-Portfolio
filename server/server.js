require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.set('trust proxy', 1);
app.disable('x-powered-by');

const clientOrigin = process.env.CLIENT_ORIGIN || '';
if (clientOrigin) {
  app.use(
    cors({
      origin: clientOrigin,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-vadmin']
    })
  );
}

// CMS admin assets — force no-cache so a stale browser build never lingers
  app.use('/admin', function (_req, res, next) {
    res.set('Cache-Control', 'no-cache, must-revalidate');
    next();
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/css', express.static(path.join(__dirname, '..', 'src', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'src', 'js')));

app.get('/api/health', (_req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString()
  });
});

app.use('/api/profile', require('./routes/profile.routes'));
app.use('/api/skills', require('./routes/skills.routes'));
app.use('/api/projects', require('./routes/projects.routes'));
app.use('/api/experience', require('./routes/experience.routes'));
app.use('/api/education', require('./routes/education.routes'));
app.use('/api/certificates', require('./routes/certificates.routes'));
app.use('/api/contact', require('./routes/contact.routes'));
app.use('/api/admin', require('./routes/admin/index'));

// Admin CMS pages (unlinked from the public site; all data access is protected).
const adminPage = (file) => (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', file));
};
app.get('/vinit-control', adminPage('login.html'));
app.get('/vinit-control/login', adminPage('login.html'));
app.get('/vinit-control/verify', adminPage('verify.html'));
app.get('/vinit-control/forgot-password', adminPage('forgot.html'));
app.get('/vinit-control/reset-password', adminPage('reset.html'));
app.get('/vinit-control/dashboard', adminPage('dashboard.html'));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.use((err, _req, res, _next) => {
  if (err && err.fileTypeInvalid) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File is too large.' });
  }
  if (err && err.statusCode) {
    return res.status(Number(err.statusCode) || 400).json({ success: false, message: err.message });
  }
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error('[error]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Vercel runs this as a serverless function (process.env.VERCEL === '1').
// There we still connect to MongoDB and seed, but we must not call app.listen()
// — the exported Express app handles each invocation, and binding a port would
// conflict with @vercel/node's own bridge. Local `npm start`/`npm run dev`
// behavior is unchanged.
const IS_SERVERLESS = process.env.VERCEL === '1';

// Safe startup diagnostics — never prints credentials, only presence/host.
function safeDbHost(uri) {
  try {
    const m = String(uri || '').match(/^(?:mongodb(?:\+srv)?):\/\/(?:[^@/]+@)?([^/?#]+)/);
    return m ? m[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}
const srvDbUri = process.env.MONGODB_URI || '';
console.log(
  `[env] VERCEL=${process.env.VERCEL || 'not set'} NODE_ENV=${process.env.NODE_ENV || 'not set'} | ` +
    `MONGODB_URI=${srvDbUri ? `set (host="${safeDbHost(srvDbUri)}")` : 'NOT set'}`
);

if (!process.env.JWT_SECRET) {
  console.warn('[env] JWT_SECRET NOT set on this runtime.');
}

(async () => {
  let dbConnected = false;
  try {
    await connectDB();
    dbConnected = true;

    const { seedDatabase } = require('./seed/seed');
    const results = await seedDatabase();
    console.log(`[seed] ${JSON.stringify(results)}`);
  } catch (err) {
    dbConnected = false;
    console.warn(
      `[DB] MongoDB unavailable (name=${err && err.name ? err.name : 'unknown'}, code=${err && err.code != null ? err.code : 'n/a'}). The API endpoints will report 503 and the frontend will use its bundled fallback content.`
    );
  }

  if (IS_SERVERLESS) {
    console.log(`[server] Running on Vercel (serverless). Database: ${dbConnected ? 'connected' : 'NOT connected'}`);
    return;
  }

  app.listen(PORT, () => {
    console.log(`[server] Portfolio running at http://localhost:${PORT}`);
    console.log(`[server] Database: ${dbConnected ? 'connected' : 'NOT connected'}`);
  });
})();

module.exports = app;