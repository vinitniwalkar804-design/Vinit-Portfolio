const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  degree: { type: String, required: true },
  field: { type: String, default: '' },
  institution: { type: String, default: '' },
  period: { type: String, default: '' },
  detail: { type: String, default: '' },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Education', educationSchema);