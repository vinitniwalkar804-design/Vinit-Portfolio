const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    verificationTokenHash: { type: String, default: '' },
    verificationExpiresAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: '' },
    resetExpiresAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);