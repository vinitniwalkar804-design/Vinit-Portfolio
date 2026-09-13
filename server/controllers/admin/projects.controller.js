const Project = require('../../models/Project');
const { optionalStr, requiredStr, cleanArray, cleanUrl, cleanOrder } = require('../../utils/validate');

exports.getProjects = async (_req, res) => {
  const projects = await Project.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: projects });
};

exports.createProject = async (req, res) => {
  const b = req.body || {};
  const doc = {
    name: requiredStr(b.name, 120, 'Project name'),
    subtitle: optionalStr(b.subtitle, 200),
    tagline: optionalStr(b.tagline, 300),
    description: optionalStr(b.description, 5000),
    featured: !!b.featured,
    badge: optionalStr(b.badge, 80),
    tags: cleanArray(b.tags),
    github: cleanUrl(b.github),
    liveUrl: cleanUrl(b.liveUrl),
    order: cleanOrder(b.order, await Project.countDocuments())
  };
  if (b.caseStudy && typeof b.caseStudy === 'object') {
    const cs = b.caseStudy;
    doc.caseStudy = {
      overview: optionalStr(cs.overview, 5000),
      problem: optionalStr(cs.problem, 5000),
      solution: optionalStr(cs.solution, 5000),
      architecture: optionalStr(cs.architecture, 5000),
      featuredFeatures: cleanArray(cs.featuredFeatures),
      techStack: cleanArray(cs.techStack),
      role: optionalStr(cs.role, 500),
      impact: optionalStr(cs.impact, 5000)
    };
  }
  const saved = await Project.create(doc);
  res.status(201).json({ success: true, data: saved });
};

exports.updateProject = async (req, res) => {
  const b = req.body || {};
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

  const patch = {
    name: requiredStr(b.name, 120, 'Project name'),
    subtitle: optionalStr(b.subtitle, 200),
    tagline: optionalStr(b.tagline, 300),
    description: optionalStr(b.description, 5000),
    featured: !!b.featured,
    badge: optionalStr(b.badge, 80),
    tags: cleanArray(b.tags),
    github: cleanUrl(b.github),
    liveUrl: cleanUrl(b.liveUrl),
    order: cleanOrder(b.order, project.order)
  };
  if (b.hasOwnProperty('caseStudy') && b.caseStudy && typeof b.caseStudy === 'object') {
    const cs = b.caseStudy;
    patch.caseStudy = {
      overview: optionalStr(cs.overview, 5000),
      problem: optionalStr(cs.problem, 5000),
      solution: optionalStr(cs.solution, 5000),
      architecture: optionalStr(cs.architecture, 5000),
      featuredFeatures: cleanArray(cs.featuredFeatures),
      techStack: cleanArray(cs.techStack),
      role: optionalStr(cs.role, 500),
      impact: optionalStr(cs.impact, 5000)
    };
  }
  Object.assign(project, patch);
  await project.save();
  res.json({ success: true, data: project });
};

exports.deleteProject = async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
  res.json({ success: true, data: { id: req.params.id } });
};

exports.reorderProjects = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : (req.body && req.body.items) || [];
  if (!items.length) return res.status(400).json({ success: false, message: 'No reorder data provided.' });
  for (const row of items.slice(0, 200)) {
    const id = String(row.id || row._id || '');
    if (!id) continue;
    await Project.updateOne({ _id: id }, { $set: { order: cleanOrder(row.order) } });
  }
  const projects = await Project.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: projects });
};