const bcrypt = require('bcryptjs');
const Admin = require('../../models/Admin');
const {
  COOKIE_NAME,
  signAdminToken,
  hashToken,
  randomToken,
  isAllowedAdminEmail,
  ALLOWED_ADMIN_EMAIL
} = require('../../config/auth');
const { cookieOptions } = require('../../middleware/adminAuth');
const {
  sendVerificationEmail,
  sendResetEmail,
  isEmailConfigured
} = require('../../services/adminEmail.service');

const SESSION_MS = 12 * 60 * 60 * 1000;
const VERIFY_TTL_MS = 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function originOf(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function publicAdmin(admin) {
  return {
    id: String(admin._id),
    email: admin.email,
    verified: !!admin.verified,
    verifiedAt: admin.verifiedAt || null,
    lastLoginAt: admin.lastLoginAt || null
  };
}

const debugEcho = process.env.ADMIN_TEST_ECHO_TOKENS === 'true' && process.env.NODE_ENV !== 'production';

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// ---------------------------------------------------------------- login ----

exports.login = async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');

  const fail = () =>
    res.status(401).json({ success: false, message: 'Invalid email or password.' });

  if (!email || !password || !isAllowedAdminEmail(email)) return fail();

  const admin = await Admin.findOne({ email });
  if (!admin) return fail();

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    await Admin.updateOne({ _id: admin._id }, { lastLoginAt: null });
    return fail();
  }

  admin.lastLoginAt = new Date();
  if (!admin.verified) {
    const token = randomToken(32);
    admin.verificationTokenHash = hashToken(token);
    admin.verificationExpiresAt = new Date(Date.now() + VERIFY_TTL_MS);
    await admin.save();

    const debugPayload = debugEcho ? { debugToken: token } : {};
    const verifyUrl = `${originOf(req)}/vinit-control/verify?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      if (!isEmailConfigured()) throw Object.assign(new Error('not configured'), { emailNotConfigured: true });
      await sendVerificationEmail({ to: email, verifyUrl });
      return res.status(403).json({
        success: false,
        code: 'verification_required',
        message: 'A verification email has been sent. Check your inbox before continuing.',
        ...debugPayload
      });
    } catch (err) {
      if (err && err.emailNotConfigured) {
        return res.status(403).json({
          success: false,
          code: 'verification_required',
          message: 'Verification is required. Email is not configured - use the resend link or bootstrap token.',
          ...debugPayload
        });
      }
      return res.status(500).json({
        success: false,
        code: 'verification_email_failed',
        message: 'Account requires verification, but the verification email could not be sent. Try again shortly.',
        ...debugPayload
      });
    }
  }

  const token = signAdminToken(admin._id, admin.email);
  res.cookie(COOKIE_NAME, token, cookieOptions(SESSION_MS));
  await admin.save();
  return res.json({ success: true, data: publicAdmin(admin) });
};

// ------------------------------------------------------------------ me ----

exports.me = async (req, res) => {
  const admin = await Admin.findById(req.admin.id);
  if (!admin) return res.status(401).json({ success: false, message: 'Session invalid.' });
  return res.json({ success: true, data: publicAdmin(admin) });
};

// -------------------------------------------------------------- verify ----

exports.verifyEmail = async (req, res) => {
  const token = String((req.body && req.body.token) || '');
  if (!token) return res.status(400).json({ success: false, message: 'Verification token is required.' });

  const admin = await Admin.findOne({ email: ALLOWED_ADMIN_EMAIL });
  if (!admin) return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
  if (admin.verified) return res.json({ success: true, data: publicAdmin(admin) });

  const hashed = hashToken(token);
  if (!admin.verificationTokenHash || admin.verificationTokenHash !== hashed) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
  }
  if (!admin.verificationExpiresAt || admin.verificationExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ success: false, code: 'expired', message: 'This verification link has expired. Request a new one.' });
  }

  admin.verified = true;
  admin.verifiedAt = new Date();
  admin.verificationTokenHash = '';
  admin.verificationExpiresAt = null;
  await admin.save();

  return res.json({ success: true, data: publicAdmin(admin) });
};

// ------------------------------------------------------- resend verify ----

exports.resendVerification = async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!isAllowedAdminEmail(email)) {
    return res.status(200).json({ success: true, message: 'If the account exists, a verification email has been sent.' });
  }

  const admin = await Admin.findOne({ email });
  if (!admin || admin.verified) {
    return res.status(200).json({ success: true, message: 'If the account exists, a verification email has been sent.' });
  }

  const token = randomToken(32);
  admin.verificationTokenHash = hashToken(token);
  admin.verificationExpiresAt = new Date(Date.now() + VERIFY_TTL_MS);
  await admin.save();

  const debugPayload = debugEcho ? { debugToken: token } : {};
  try {
    if (!isEmailConfigured()) throw Object.assign(new Error('not configured'), { emailNotConfigured: true });
    await sendVerificationEmail({
      to: admin.email,
      verifyUrl: `${originOf(req)}/vinit-control/verify?token=${token}&email=${encodeURIComponent(admin.email)}`
    });
    return res.json({ success: true, message: 'A verification email has been sent.', ...debugPayload });
  } catch (err) {
    return res.status(200).json({
      success: false,
      code: 'verification_email_failed',
      message: 'A verification email could not be sent right now. Please try again.',
      ...debugPayload
    });
  }
};

// ------------------------------------------------------- forgot password --

exports.forgotPassword = async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const generic = () =>
    res.json({ success: true, message: 'If that email is registered, a password reset link has been sent.' });

  if (!isAllowedAdminEmail(email)) return generic();

  const admin = await Admin.findOne({ email });
  if (!admin) return generic();

  const token = randomToken(32);
  admin.resetTokenHash = hashToken(token);
  admin.resetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
  await admin.save();

  const debugPayload = debugEcho ? { debugToken: token } : {};
  try {
    if (!isEmailConfigured()) throw Object.assign(new Error('not configured'), { emailNotConfigured: true });
    await sendResetEmail({
      to: admin.email,
      resetUrl: `${originOf(req)}/vinit-control/reset-password?token=${token}&email=${encodeURIComponent(admin.email)}`
    });
    return res.json({ success: true, message: 'If that email is registered, a password reset link has been sent.', ...debugPayload });
  } catch (err) {
    return res.json({
      success: false,
      code: 'reset_email_failed',
      message: 'If that email is registered, a reset link could not be sent right now. Please try again.',
      ...debugPayload
    });
  }
};

// --------------------------------------------------------- reset password --

exports.resetPassword = async (req, res) => {
  const token = String((req.body && req.body.token) || '');
  const password = String((req.body && req.body.password) || '');

  if (!token) return res.status(400).json({ success: false, message: 'Reset token is required.' });
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ success: false, message: 'Password must be between 8 and 72 characters.' });
  }

  const admin = await Admin.findOne({ email: ALLOWED_ADMIN_EMAIL });
  if (!admin || !admin.resetTokenHash) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
  }
  if (!admin.resetExpiresAt || admin.resetExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ success: false, code: 'expired', message: 'This reset link has expired. Request a new one.' });
  }
  if (admin.resetTokenHash !== hashToken(token)) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
  }

  admin.passwordHash = await hashPassword(password);
  admin.resetTokenHash = '';
  admin.resetExpiresAt = null;
  await admin.save();

  return res.json({ success: true, message: 'Password updated. You can now log in.' });
};

// ---------------------------------------------------------------- logout --

// --------------------------------------------------------- change password --

exports.changePassword = async (req, res) => {
  const current = String((req.body && req.body.currentPassword) || '');
  const next = String((req.body && req.body.newPassword) || '');

  if (next.length < 8 || next.length > 72) {
    return res.status(400).json({ success: false, message: 'New password must be between 8 and 72 characters.' });
  }

  const admin = await Admin.findById(req.admin.id);
  if (!admin) return res.status(401).json({ success: false, message: 'Session invalid.' });

  const ok = await bcrypt.compare(current, admin.passwordHash);
  if (!ok) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  admin.passwordHash = await hashPassword(next);
  await admin.save();
  return res.json({ success: true, message: 'Password updated.' });
};

// ---------------------------------------------------------------- logout ----

exports.logout = (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'lax' });
  return res.json({ success: true, message: 'Logged out.' });
};