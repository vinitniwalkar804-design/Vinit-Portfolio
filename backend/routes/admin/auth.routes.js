const express = require('express');
const router = express.Router();
const auth = require('../../controllers/admin/auth.controller');
const { isDbConnected } = require('../../middleware/db');
const { requireAdmin } = require('../../middleware/adminAuth');
const { createRateLimiter } = require('../../middleware/rateLimit');
const { asyncHandler } = require('../../utils/asyncHandler');

const keyIp = (req) => req.ip || 'unknown';
const keyLogin = (req) =>
  `${req.ip}|${String((req.body && req.body.email) || '').trim().toLowerCase()}`;

const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8, keyFn: keyLogin, name: 'login' });
const forgotLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 4, keyFn: keyIp, name: 'forgot' });
const resetLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 6, keyFn: keyIp, name: 'reset' });
const verifyLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, keyFn: keyIp, name: 'verify' });
const changeLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, keyFn: keyIp, name: 'change-password' });

router.post('/login', isDbConnected, loginLimiter, asyncHandler(auth.login));
router.post('/logout', asyncHandler(auth.logout));
router.get('/me', isDbConnected, requireAdmin, asyncHandler(auth.me));
router.post('/change-password', isDbConnected, requireAdmin, changeLimiter, asyncHandler(auth.changePassword));
router.post('/verify', isDbConnected, verifyLimiter, asyncHandler(auth.verifyEmail));
router.post('/resend-verification', isDbConnected, forgotLimiter, asyncHandler(auth.resendVerification));
router.post('/forgot-password', isDbConnected, forgotLimiter, asyncHandler(auth.forgotPassword));
router.post('/reset-password', isDbConnected, resetLimiter, asyncHandler(auth.resetPassword));

module.exports = router;