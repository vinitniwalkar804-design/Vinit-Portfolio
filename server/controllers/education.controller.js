const Education = require('../models/Education');

exports.getEducation = async (_req, res) => {
  const education = await Education.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: education });
};