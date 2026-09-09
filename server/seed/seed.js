const mongoose = require('mongoose');

const Profile = require('../models/Profile');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Experience = require('../models/Experience');
const Education = require('../models/Education');
const Certificate = require('../models/Certificate');

const seedData = require('./seedData');

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