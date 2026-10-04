const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  items: [{ type: String }]
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subtitle: { type: String, default: '' },
  tagline: { type: String, default: '' },
  description: { type: String, required: true },
  featured: { type: Boolean, default: false },
  badge: { type: String, default: '' },
  tags: [{ type: String }],
  github: { type: String, default: '' },
  liveUrl: { type: String, default: '' },
  caseStudy: {
    overview: { type: String, default: '' },
    problem: { type: String, default: '' },
    solution: { type: String, default: '' },
    architecture: { type: String, default: '' },
    featuredFeatures: [{ type: String }],
    techStack: [{ type: String }],
    role: { type: String, default: '' },
    impact: { type: String, default: '' }
  },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);