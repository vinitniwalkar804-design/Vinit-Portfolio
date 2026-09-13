const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: '' },
    url: { type: String, default: '/assets/Vinit-Niwalkar-Resume.pdf' },
    mimeType: { type: String, default: 'application/pdf' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);