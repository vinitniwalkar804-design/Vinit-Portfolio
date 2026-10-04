const Skill = require('../models/Skill');

exports.getSkills = async (_req, res) => {
  const skills = await Skill.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: skills });
};