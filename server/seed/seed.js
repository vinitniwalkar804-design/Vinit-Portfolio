const mongoose = require('mongoose');

const Profile = require('../models/Profile');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Education = require('../models/Education');
const Certificate = require('../models/Certificate');

const seedData = require('./seedData');

async function patchMissingProjectFields() {
  let patched = 0;
  for (const sp of seedData.projects) {
    const existing = await Project.findOne({ order: sp.order });
    if (!existing) continue;
    const upd = {};
    if (!existing.badge && sp.badge) upd.badge = sp.badge;
    if (existing.caseStudy && !existing.caseStudy.architecture && sp.caseStudy && sp.caseStudy.architecture)
      upd['caseStudy.architecture'] = sp.caseStudy.architecture;
    if (existing.caseStudy && !existing.caseStudy.impact && sp.caseStudy && sp.caseStudy.impact)
      upd['caseStudy.impact'] = sp.caseStudy.impact;
    if (Object.keys(upd).length) {
      await Project.updateOne({ _id: existing._id }, { $set: upd });
      patched++;
    }
  }
  return patched;
}

async function insertMissingCertificates() {
  let added = 0;
  let patched = 0;
  const syncFields = ['title', 'provider', 'icon', 'category', 'order', 'issuedAt', 'certificateId', 'credentialUrl', 'file'];
  for (const sc of seedData.certificates) {
    // match by file when present, else by order — avoids duplicate cards
    let existing = null;
    if (sc.file) existing = await Certificate.findOne({ file: sc.file });
    if (!existing) existing = await Certificate.findOne({ order: sc.order });
    if (!existing) {
      await Certificate.insertMany([{ ...sc }]);
      added++;
      continue;
    }
    const upd = {};
    for (const f of syncFields) {
      if (sc[f] !== undefined && existing[f] === undefined || (sc[f] !== undefined && existing[f] !== sc[f])) upd[f] = sc[f];
    }
    if (Object.keys(upd).length) {
      await Certificate.updateOne({ _id: existing._id }, { $set: upd });
      patched++;
    }
  }
  return { added, patched };
}

async function seedDatabase({ force = false } = {}) {
  const results = {};

  const run = async (Model, collection, name) => {
    if (!force && (await Model.countDocuments()) > 0) {
      results[name] = 'skipped (already present)';
      return;
    }
    if (force) await Model.deleteMany({});
    const docs = collection.map((d) => ({ ...d }));
    await Model.insertMany(docs);
    results[name] = `seeded ${docs.length} document(s)`;
  };

  await run(Profile, [seedData.profile], 'profile');
  await run(Skill, seedData.skills, 'skills');
  await run(Project, seedData.projects, 'projects');
  await run(Experience, seedData.experience, 'experience');
  await run(Education, seedData.education, 'education');
  await run(Certificate, seedData.certificates, 'certificates');

  const projectPatch = await patchMissingProjectFields();
  results['projects:additive-patch'] = `patched ${projectPatch} project(s)` +
    (force ? ' (force reseed skipped patch)' : '');

  const certSync = await insertMissingCertificates();
  results['certificates:additive'] = `added ${certSync.added}, patched ${certSync.patched} certificate(s)`;

  return results;
}

if (require.main === module) {
  const run = async () => {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`[seed] Connected to ${uri}`);
      const force = process.argv.includes('--force');
      const results = await seedDatabase({ force });
      console.log(`[seed] ${JSON.stringify(results, null, 2)}`);
      console.log('[seed] Done. The "portfolio" database was created (or updated) automatically by MongoDB.');
      await mongoose.disconnect();
    } catch (err) {
      console.error('[seed] Failed:', err.message);
      process.exit(1);
    }
  };
  run();
}

module.exports = { seedDatabase };