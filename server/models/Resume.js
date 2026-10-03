const mongoose = require('mongoose');

const { RESUME_URL } = require('../config/storage');

/**
 * One active resume revision, plus the revisions it replaced.
 *
 * `url` is the stable public path the site always links to and never changes.
 * `storageUrl` is where the bytes actually live for the active revision - a
 * Vercel Blob URL in production, empty for the local-filesystem provider. The
 * two are deliberately separate: swapping providers, or a URL that a CDN
 * re-signs later, must not break the public link.
 *
 * `archive` snapshots the outgoing revision on every replace, so the previous
 * resume is never silently destroyed. Object storage keeps every revision
 * addressable at its own `storageUrl`; the local provider keeps a timestamped
 * copy under public/assets/_archive/.
 */
const archiveEntry = new mongoose.Schema(
  {
    fileName: { type: String, default: '' },
    url: { type: String, default: '' },
    storageUrl: { type: String, default: '' },
    storageProvider: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { type: String, default: '' }
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: 'Vinit-Niwalkar-Resume.pdf' },
    url: { type: String, default: RESUME_URL },
    mimeType: { type: String, default: 'application/pdf' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { type: String, default: '' },
    storageProvider: { type: String, default: '' },
    storageUrl: { type: String, default: '' },
    blobPathname: { type: String, default: '' },
    archive: { type: [archiveEntry], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
