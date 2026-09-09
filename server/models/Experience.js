const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  organization: { type: String, default: '' },
  type: { type: String, default: 'Internship' },
  period: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: [{ type: String }],
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Experience', experienceSchema);