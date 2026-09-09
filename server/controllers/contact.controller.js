const Message = require('../models/Message');
const { sendContactNotification } = require('../services/email.service');

const recentSubmissions = new Map();
const DEDUPE_MS = 60 * 1000;

function dedupeKey(email, message) {
  return String(email).trim().toLowerCase() + '|' + String(message).trim().toLowerCase();
}

function isDuplicate(email, message) {
  const key = dedupeKey(email, message);
  const last = recentSubmissions.get(key);
  const now = Date.now();
  if (last && now - last < DEDUPE_MS) return true;
  recentSubmissions.set(key, now);
  if (recentSubmissions.size > 500) {
    for (const [k, t] of recentSubmissions) {
      if (now - t >= DEDUPE_MS) recentSubmissions.delete(k);
    }
  }
  return false;
}

exports.submitContact = async (req, res) => {
  const { name, email, message } = req.body || {};

  const errors = [];
  if (!name || String(name).trim().length < 2) errors.push('Name must be at least 2 characters.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim()))
    errors.push('A valid email is required.');
  if (!message || String(message).trim().length < 10)
    errors.push('Message must be at least 10 characters.');

  if (errors.length) {
    return res.status(400).json({ success: false, message: errors.join(' '), errors });
  }

  const clean = {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    message: String(message).trim()
  };

  if (isDuplicate(clean.email, clean.message)) {
    return res.status(429).json({
      success: false,
      message: 'Your message was already submitted. Please wait a moment before trying again.'
    });
  }

  let saved;
  try {
    saved = await Message.create(clean);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }
    console.error('[contact] MongoDB save failed:', err.message);
    return res.status(503).json({ success: false, message: 'Could not save your message right now. Please try again later.' });
  }

  sendContactNotification({
    name: clean.name,
    email: clean.email,
    message: clean.message,
    createdAt: saved.createdAt
  })
    .then(() => {
      res.status(201).json({
        success: true,
        emailStatus: 'sent',
        message: "Message sent successfully! I'll get back to you soon.",
        id: saved._id
      });
    })
    .catch((err) => {
      if (err && err.emailNotConfigured) {
        console.warn('[contact] Email notification skipped: not configured (EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD missing).');
        res.status(201).json({
          success: true,
          emailStatus: 'not_configured',
          message: 'Message saved successfully, but the email notification is not configured yet.',
          id: saved._id
        });
      } else {
        console.error('[contact] Message saved, but email notification failed:', err.message);
        res.status(201).json({
          success: true,
          emailStatus: 'failed',
          message: 'Message saved successfully! The email notification failed, but your message was received — please try again later if you need a reply.',
          id: saved._id
        });
      }
    });
};