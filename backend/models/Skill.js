const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  category: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Skill', skillSchema);