require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.disable('x-powered-by');

const clientOrigin = process.env.CLIENT_ORIGIN || '';
if (clientOrigin) {
  app.use(
    cors({
      origin: clientOrigin,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type']
    })
  );
}

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

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

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
      `[DB] MongoDB unavailable (${err.message}). The API endpoints will report 503 and the frontend will use its bundled fallback content.`
    );
  }

  app.listen(PORT, () => {
    console.log(`[server] Portfolio running at http://localhost:${PORT}`);
    console.log(`[server] Database: ${dbConnected ? 'connected' : 'NOT connected'}`);
  });
})();

module.exports = app;