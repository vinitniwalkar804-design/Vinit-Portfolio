const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ALLOWED_ADMIN_EMAIL = 'vinitniwalkar804@gmail.com';
const COOKIE_NAME = 'vinits_admin_session';

let jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
  jwtSecret = crypto.randomBytes(48).toString('hex');
  console.warn(
    '[admin] JWT_SECRET not set in .env - using an ephemeral secret. Admin sessions will reset whenever the server restarts.'
  );
}

const JWT_TTL = process.env.ADMIN_JWT_TTL || '12h';

function signAdminToken(adminId, email) {
  return jwt.sign({ sub: String(adminId), email, role: 'admin' }, jwtSecret, {
    expiresIn: JWT_TTL,
    issuer: 'vinit-portfolio-admin',
    audience: 'vinit-portfolio-admin'
  });
}

function verifyAdminToken(token) {
  return jwt.verify(token, jwtSecret, {
    issuer: 'vinit-portfolio-admin',
    audience: 'vinit-portfolio-admin'
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function isAllowedAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ALLOWED_ADMIN_EMAIL;
}

module.exports = {
  ALLOWED_ADMIN_EMAIL,
  COOKIE_NAME,
  signAdminToken,
  verifyAdminToken,
  hashToken,
  randomToken,
  isAllowedAdminEmail
};