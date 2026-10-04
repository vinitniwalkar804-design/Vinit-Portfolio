const Certificate = require('../../models/Certificate');
const { optionalStr, requiredStr, cleanUrl, cleanOrder } = require('../../utils/validate');
const storage = require('../../config/storage');

exports.getCertificates = async (_req, res) => {
  const certificates = await Certificate.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: certificates });
};

exports.createCertificate = async (req, res) => {
  const b = req.body || {};
  const doc = {
    title: requiredStr(b.title, 200, 'Certificate title'),
    provider: optionalStr(b.provider, 120),
    category: optionalStr(b.category, 80),
    icon: optionalStr(b.icon, 60),
    order: cleanOrder(b.order, await Certificate.countDocuments()),
    issuedAt: optionalStr(b.issuedAt, 60),
    certificateId: optionalStr(b.certificateId, 120),
    credentialUrl: cleanUrl(b.credentialUrl)
  };
  const saved = await Certificate.create(doc);
  res.status(201).json({ success: true, data: saved });
};

exports.updateCertificate = async (req, res) => {
  const b = req.body || {};
  const cert = await Certificate.findById(req.params.id);
  if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

  const patch = {
    title: requiredStr(b.title, 200, 'Certificate title'),
    provider: optionalStr(b.provider, 120),
    category: optionalStr(b.category, 80),
    icon: optionalStr(b.icon, 60),
    order: cleanOrder(b.order, cert.order),
    issuedAt: optionalStr(b.issuedAt, 60),
    certificateId: optionalStr(b.certificateId, 120),
    credentialUrl: cleanUrl(b.credentialUrl)
  };
  Object.assign(cert, patch);
  await cert.save();
  res.json({ success: true, data: cert });
};

exports.deleteCertificate = async (req, res) => {
  const cert = await Certificate.findById(req.params.id);
  if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });
  const oldFile = cert.file;
  await cert.deleteOne();
  if (oldFile) await storage.removeByUrl(oldFile);
  res.json({ success: true, data: { id: req.params.id } });
};

exports.uploadCertificateFile = async (req, res) => {
  const cert = await Certificate.findById(req.params.id);
  if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

  const { file } = req;
  if (!file || !file.buffer || !file.buffer.length) {
    return res.status(400).json({ success: false, message: 'A PDF file is required.' });
  }

  const stored = await storage.savePdf({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    title: cert.title || 'certificate',
    category: 'certificates'
  });

  const oldFile = cert.file;
  cert.file = stored.url;
  await cert.save();
  if (oldFile && oldFile !== stored.url) await storage.removeByUrl(oldFile);

  res.json({ success: true, data: { file: stored.url } });
};

exports.removeCertificateFile = async (req, res) => {
  const cert = await Certificate.findById(req.params.id);
  if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });
  const oldFile = cert.file;
  if (!oldFile) return res.json({ success: true, data: { file: '' } });
  cert.file = '';
  await cert.save();
  await storage.removeByUrl(oldFile);
  res.json({ success: true, data: { file: '' } });
};

exports.reorderCertificates = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : (req.body && req.body.items) || [];
  if (!items.length) return res.status(400).json({ success: false, message: 'No reorder data provided.' });
  for (const row of items.slice(0, 300)) {
    const id = String(row.id || row._id || '');
    if (!id) continue;
    await Certificate.updateOne({ _id: id }, { $set: { order: cleanOrder(row.order) } });
  }
  const certificates = await Certificate.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: certificates });
};