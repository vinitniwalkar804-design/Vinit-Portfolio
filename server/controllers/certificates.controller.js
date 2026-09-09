const Certificate = require('../models/Certificate');

exports.getCertificates = async (_req, res) => {
  const certificates = await Certificate.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: certificates });
};