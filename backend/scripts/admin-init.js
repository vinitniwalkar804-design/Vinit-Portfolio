/**
 * Single-admin bootstrap.
 *
 * Creates (or resets the password of) the one allowed admin account using
 * environment variables. No public registration exists.
 *
 *   npm run admin:init
 *
 * Requires ADMIN_EMAIL + ADMIN_PASSWORD in `.env`. Re-running refreshes the
 * password hash from `.env` without toggling verification status. The password
 * is never printed, stored in source or sent to the frontend.
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const { ALLOWED_ADMIN_EMAIL, isAllowedAdminEmail } = require('../config/auth');

(async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!isAllowedAdminEmail(email)) {
    console.error('[admin:init] ADMIN_EMAIL must be exactly ' + ALLOWED_ADMIN_EMAIL + '. The admin system allows a single admin only.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('[admin:init] ADMIN_PASSWORD is required and must be at least 8 characters. Set it in .env before running.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  try {
    await connectDB();
  } catch (err) {
    console.error('[admin:init] Could not connect to MongoDB:', err.message);
    process.exit(1);
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.passwordHash = hash;
    await existing.save();
    console.log(`[admin:init] Admin password updated for ${email}. Verified status preserved (verified=${existing.verified}).`);
  } else {
    await Admin.create({ email, passwordHash: hash, verified: false });
    console.log(`[admin:init] Admin account created for ${email}. Verification is required before dashboard access.`);
  }

  await new Promise((resolve) => setTimeout(resolve, 50));
  const mongoose = require('mongoose');
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('[admin:init] Failed:', err.message);
  process.exit(1);
});