const nodemailer = require('nodemailer');

const EMAIL_HOST = process.env.EMAIL_HOST || '';
const EMAIL_PORT = Number(process.env.EMAIL_PORT || (EMAIL_HOST ? 587 : 0));
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true' || EMAIL_PORT === 465;
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || '';

function isEmailConfigured() {
  return Boolean(EMAIL_HOST && EMAIL_USER && EMAIL_PASSWORD);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    const err = new Error('Email is not configured. Set EMAIL_HOST, EMAIL_USER and EMAIL_PASSWORD in .env');
    err.emailNotConfigured = true;
    throw err;
  }
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_SECURE,
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD }
  });
}

module.exports = { isEmailConfigured, getTransporter, EMAIL_USER };