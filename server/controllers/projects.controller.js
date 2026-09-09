const Project = require('../models/Project');

exports.getProjects = async (_req, res) => {
  const projects = await Project.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: projects });
};