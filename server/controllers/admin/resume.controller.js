const Resume = require('../../models/Resume');
const storage = require('../../config/storage');
const { optionalStr } = require('../../utils/validate');

exports.getMetadata = async (_req, res) => {
  let meta = await Resume.findOne().sort({ createdAt: -1 }).lean();
  if (!meta) {
    meta = {
      fileName: 'Vinit-Niwalkar-Resume.pdf',
      url: storage.RESUME_URL,
      mimeType: 'application/pdf',
      size: storage.existsByUrl(storage.RESUME_URL) ? 0 : 0,
      uploadedAt: null
    };
  }
  const present = storage.existsByUrl(meta.url || storage.RESUME_URL);
  res.json({
    success: true,
    data: {
      fileName: meta.fileName,
      url: meta.url || storage.RESUME_URL,
      size: meta.size || 0,
      uploadedAt: meta.uploadedAt || null,
      whetherPresent: { file: meta.url || storage.RESUME_URL, present }
    }
  });
};

exports.uploadResume = async (req, res) => {
  const { file } = req;
  if (!file || !file.buffer || !file.buffer.length) {
    return res.status(400).json({ success: false, message: 'A PDF file is required.' });
  }

  const stored = await storage.replaceResume({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype
  });

  const upd = {
    fileName: stored.name,
    url: stored.url,
    mimeType: 'application/pdf',
    size: stored.size,
    uploadedAt: new Date(),
    uploadedBy: (req.admin && req.admin.email) || ''
  };

  const existing = await Resume.findOne().sort({ createdAt: -1 });
  if (existing) {
    Object.assign(existing, upd);
    await existing.save();
  } else {
    await Resume.create(upd);
  }

  res.json({
    success: true,
    data: { fileName: stored.name, url: stored.url, size: stored.size }
  });
};