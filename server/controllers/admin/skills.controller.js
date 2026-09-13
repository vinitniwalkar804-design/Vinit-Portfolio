const Skill = require('../../models/Skill');
const { optionalStr, requiredStr, cleanOrder } = require('../../utils/validate');

exports.getSkills = async (_req, res) => {
  const skills = await Skill.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: skills });
};

exports.createSkill = async (req, res) => {
  const b = req.body || {};
  const doc = {
    category: requiredStr(b.category, 80, 'Category'),
    name: requiredStr(b.name, 120, 'Skill name'),
    icon: optionalStr(b.icon, 60),
    order: cleanOrder(b.order, await Skill.countDocuments())
  };
  const saved = await Skill.create(doc);
  res.status(201).json({ success: true, data: saved });
};

exports.updateSkill = async (req, res) => {
  const b = req.body || {};
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ success: false, message: 'Skill not found.' });
  Object.assign(skill, {
    category: requiredStr(b.category, 80, 'Category'),
    name: requiredStr(b.name, 120, 'Skill name'),
    icon: optionalStr(b.icon, 60),
    order: cleanOrder(b.order, skill.order)
  });
  await skill.save();
  res.json({ success: true, data: skill });
};

exports.deleteSkill = async (req, res) => {
  const skill = await Skill.findByIdAndDelete(req.params.id);
  if (!skill) return res.status(404).json({ success: false, message: 'Skill not found.' });
  res.json({ success: true, data: { id: req.params.id } });
};

exports.reorderSkills = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : (req.body && req.body.items) || [];
  if (!items.length) return res.status(400).json({ success: false, message: 'No reorder data provided.' });
  for (const row of items.slice(0, 500)) {
    const id = String(row.id || row._id || '');
    if (!id) continue;
    await Skill.updateOne({ _id: id }, { $set: { order: cleanOrder(row.order) } });
  }
  const skills = await Skill.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: skills });
};