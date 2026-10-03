const Resume = require('../../models/Resume');
const storage = require('../../config/storage');

/** How many superseded revisions to remember. */
const ARCHIVE_LIMIT = 10;

function snapshot(record) {
  return {
    fileName: record.fileName || storage.RESUME_FILENAME,
    url: record.url || storage.RESUME_URL,
    storageUrl: record.storageUrl || '',
    storageProvider: record.storageProvider || '',
    size: record.size || 0,
    uploadedAt: record.uploadedAt || null,
    uploadedBy: record.uploadedBy || ''
  };
}

/**
 * Metadata for the admin "Resume" panel.
 *
 * Before the CMS has ever stored a revision there is no Mongo record at all, so
 * fall back to the resume shipped inside the deployment and report its real size
 * and modification date. That is what the panel used to show as
 * "Size: unknown / Last uploaded: -".
 */
exports.getMetadata = async (_req, res) => {
  const record = await Resume.findOne().sort({ createdAt: -1 }).lean();

  const bundled = record ? null : storage.statBundledResume();

  const fileName = (record && record.fileName) || storage.RESUME_FILENAME;
  const url = (record && record.url) || storage.RESUME_URL;
  const storageProvider = (record && record.storageProvider) || (bundled ? 'bundled' : 'none');
  const size = (record && record.size) || (bundled ? bundled.size : 0);
  const uploadedAt = (record && record.uploadedAt) || (bundled ? bundled.mtime : null);
  const storageUrl = (record && record.storageUrl) || '';

  const present = await storage.isAvailable(record || (bundled ? { url, storageProvider: 'bundled' } : null));

  res.json({
    success: true,
    data: {
      fileName,
      url,
      size,
      uploadedAt,
      storageProvider,
      storageUrl,
      present,
      archive: (record && record.archive) || []
    }
  });
};

/**
 * "Upload & replace" from the admin dashboard.
 *
 * Order matters: the file must be stored successfully BEFORE MongoDB is
 * touched. If storage throws, the request fails and the active resume - both
 * the database record and the bytes behind the public URL - is left exactly as
 * it was. A half-applied upload is the failure mode that made this feature look
 * broken in production, so it is deliberately impossible here.
 */
exports.uploadResume = async (req, res) => {
  const { file } = req;
  if (!file || !file.buffer || !file.buffer.length) {
    return res.status(400).json({ success: false, message: 'A PDF file is required.' });
  }

  // Snapshot the outgoing revision BEFORE storing the new one so it can be
  // archived even if storing the new one fails.
  const existing = await Resume.findOne().sort({ createdAt: -1 }).lean();

  let stored;
  try {
    stored = await storage.replaceResume({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype
    });
  } catch (err) {
    const status = Number(err && err.statusCode) || 500;
    if (status >= 500) {
      console.error(`[admin/resume] upload failed, active resume unchanged: ${err && err.message}`);
    } else {
      console.warn(`[admin/resume] upload rejected: ${err && err.message}`);
    }
    return res.status(status).json({
      success: false,
      message: err && err.expose ? err.message : status >= 500 ? 'Could not store the resume. Please try again.' : err.message
    });
  }

  const now = new Date();
  const fields = {
    fileName: stored.name,
    url: stored.url,
    mimeType: stored.mimeType,
    size: stored.size,
    uploadedAt: now,
    uploadedBy: (req.admin && req.admin.email) || '',
    storageProvider: stored.storageProvider,
    storageUrl: stored.storageUrl || '',
    blobPathname: stored.blobPathname || ''
  };

  try {
    const current = await Resume.findOne().sort({ createdAt: -1 });
    if (current) {
      const archive = (current.archive || []).map(snapshot);
      if (existing && (existing.storageUrl || existing.size)) archive.unshift(snapshot(existing));
      current.archive = archive.slice(0, ARCHIVE_LIMIT);
      Object.assign(current, fields);
      await current.save();
    } else {
      await Resume.create({ ...fields, archive: [] });
    }
  } catch (err) {
    // The bytes are stored but the pointer was not moved. Log loudly: the
    // stored object is orphaned, the public resume still serves the previous
    // revision, and nothing is inconsistent for visitors.
    console.error(
      `[admin/resume] resume stored at ${stored.storageUrl || stored.url} but the database update failed (${err.message}). ` +
        'The previously active resume is still being served.'
    );
    return res.status(500).json({
      success: false,
      message: 'The resume was uploaded but could not be activated. Please try again.'
    });
  }

  res.json({
    success: true,
    data: {
      fileName: stored.name,
      url: stored.url,
      size: stored.size,
      uploadedAt: now,
      storageProvider: stored.storageProvider
    }
  });
};
