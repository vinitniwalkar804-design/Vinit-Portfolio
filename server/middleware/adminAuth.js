const Admin = require('../models/Admin');
const {
  COOKIE_NAME,
  verifyAdminToken,
  isAllowedAdminEmail,
  ALLOWED_ADMIN_EMAIL
} = require('../config/auth');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Validates the httpOnly session cookie + JWT, then ensures the subject is the
 * single allowed, verified admin. Attaches req.admin on success.
 */
async function requireAdmin(req, res, next) {
  try {
    const token =
      (req.signedCookies && req.signedCookies[COOKIE_NAME]) ||
      (req.cookies && req.cookies[COOKIE_NAME]) ||
      null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    let payload;
    try {
      payload = verifyAdminToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    if (!payload || payload.role !== 'admin' || !payload.sub) {
      return res.status(401).json({ success: false, message: 'Invalid session.' });
    }

    const admin = await Admin.findById(payload.sub).lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Session invalid.' });
    }
    if (!admin.verified) {
      return res.status(403).json({ success: false, message: 'Email verification required.' });
    }
    if (!isAllowedAdminEmail(admin.email)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    req.admin = { id: String(admin._id), email: admin.email };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
}

/**
 * CSRF mitigation for cookie-based auth: mutating admin requests must carry a
 * custom header. Browsers cannot attach arbitrary headers cross-origin without
 * a CORS preflight, and SameSite=Lax already blocks cross-site cookie sends.
 */
function csrfGuard(req, res, next) {
  const method = String(req.method || '').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  if (req.get('x-vadmin') === '1') return next();
  return res.status(403).json({ success: false, message: 'Cross-site request blocked.' });
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs
  };
}

module.exports = { requireAdmin, csrfGuard, cookieOptions, ALLOWED_ADMIN_EMAIL };