const Experience = require('../../models/Experience');
const { optionalStr, requiredStr, cleanArray, cleanOrder } = require('../../utils/validate');

exports.getExperience = async (_req, res) => {
  const items = await Experience.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: items });
};

exports.createExperience = async (req, res) => {
  const b = req.body || {};
  const doc = {
    title: requiredStr(b.title, 200, 'Title'),
    organization: optionalStr(b.organization, 200),
    type: optionalStr(b.type, 60) || 'Internship',
    period: optionalStr(b.period, 80),
    description: optionalStr(b.description, 3000),
    tags: cleanArray(b.tags),
    order: cleanOrder(b.order, await Experience.countDocuments())
  };
  const saved = await Experience.create(doc);
  res.status(201).json({ success: true, data: saved });
};

exports.updateExperience = async (req, res) => {
  const b = req.body || {};
  const item = await Experience.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Experience record not found.' });
  Object.assign(item, {
    title: requiredStr(b.title, 200, 'Title'),
    organization: optionalStr(b.organization, 200),
    type: optionalStr(b.type, 60) || 'Internship',
    period: optionalStr(b.period, 80),
    description: optionalStr(b.description, 3000),
    tags: cleanArray(b.tags),
    order: cleanOrder(b.order, item.order)
  });
  await item.save();
  res.json({ success: true, data: item });
};

exports.deleteExperience = async (req, res) => {
  const item = await Experience.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Experience record not found.' });
  res.json({ success: true, data: { id: req.params.id } });
};

exports.reorderExperience = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : (req.body && req.body.items) || [];
  if (!items.length) return res.status(400).json({ success: false, message: 'No reorder data provided.' });
  for (const row of items.slice(0, 200)) {
    const id = String(row.id || row._id || '');
    if (!id) continue;
    await Experience.updateOne({ _id: id }, { $set: { order: cleanOrder(row.order) } });
  }
  const result = await Experience.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: result });
};