const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  provider: { type: String, default: '' },
  category: { type: String, default: '' },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 },
  issuedAt: { type: String, default: '' },
  certificateId: { type: String, default: '' },
  credentialUrl: { type: String, default: '' },
  file: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);

