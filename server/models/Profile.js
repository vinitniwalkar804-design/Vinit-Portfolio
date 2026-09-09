const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  titleAccent: { type: String, default: '' },
  tagline: { type: String, default: '' },
  summary: { type: String, required: true },
  role: { type: String, default: '' },
  availability: { type: String, default: '' },
  email: { type: String, required: true },
  photo: { type: String, default: '' },
  socials: {
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);