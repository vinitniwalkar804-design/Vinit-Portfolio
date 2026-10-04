const Education = require('../../models/Education');
const { optionalStr, requiredStr, cleanOrder } = require('../../utils/validate');

exports.getEducation = async (_req, res) => {
  const items = await Education.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: items });
};

exports.createEducation = async (req, res) => {
  const b = req.body || {};
  const doc = {
    degree: requiredStr(b.degree, 200, 'Degree'),
    field: optionalStr(b.field, 200),
    institution: optionalStr(b.institution, 200),
    period: optionalStr(b.period, 80),
    detail: optionalStr(b.detail, 2000),
    order: cleanOrder(b.order, await Education.countDocuments())
  };
  const saved = await Education.create(doc);
  res.status(201).json({ success: true, data: saved });
};

exports.updateEducation = async (req, res) => {
  const b = req.body || {};
  const item = await Education.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Education record not found.' });
  Object.assign(item, {
    degree: requiredStr(b.degree, 200, 'Degree'),
    field: optionalStr(b.field, 200),
    institution: optionalStr(b.institution, 200),
    period: optionalStr(b.period, 80),
    detail: optionalStr(b.detail, 2000),
    order: cleanOrder(b.order, item.order)
  });
  await item.save();
  res.json({ success: true, data: item });
};

exports.deleteEducation = async (req, res) => {
  const item = await Education.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Education record not found.' });
  res.json({ success: true, data: { id: req.params.id } });
};

exports.reorderEducation = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : (req.body && req.body.items) || [];
  if (!items.length) return res.status(400).json({ success: false, message: 'No reorder data provided.' });
  for (const row of items.slice(0, 200)) {
    const id = String(row.id || row._id || '');
    if (!id) continue;
    await Education.updateOne({ _id: id }, { $set: { order: cleanOrder(row.order) } });
  }
  const result = await Education.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: result });
};