const Experience = require('../models/Experience');

exports.getExperience = async (_req, res) => {
  const experience = await Experience.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: experience });
};