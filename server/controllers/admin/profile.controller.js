const Profile = require('../../models/Profile');
const { optionalStr, requiredStr, cleanUrl, cleanEmail } = require('../../utils/validate');

exports.getProfile = async (_req, res) => {
  const profile = await Profile.findOne().sort({ createdAt: -1 }).lean();
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
  res.json({ success: true, data: profile });
};

exports.updateProfile = async (req, res) => {
  const b = req.body || {};

  const patch = {
    name: requiredStr(b.name, 120, 'Name'),
    title: optionalStr(b.title, 160),
    titleAccent: optionalStr(b.titleAccent, 100),
    tagline: optionalStr(b.tagline, 1000),
    summary: optionalStr(b.summary, 5000),
    role: optionalStr(b.role, 500),
    availability: optionalStr(b.availability, 80),
    email: requiredStr(b.email, 254, 'Email'),
    photo: optionalStr(b.photo, 300),
    socials: {
      github: cleanUrl(b.socials && b.socials.github),
      linkedin: cleanUrl(b.socials && b.socials.linkedin)
    }
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) {
    return res.status(400).json({ success: false, message: 'A valid email is required.' });
  }

  let profile = await Profile.findOne().sort({ createdAt: -1 });
  if (!profile) profile = new Profile(patch);
  else Object.assign(profile, patch);
  await profile.save();

  res.json({ success: true, data: profile });
};