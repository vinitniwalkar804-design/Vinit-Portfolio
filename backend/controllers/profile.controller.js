const Profile = require('../models/Profile');

exports.getProfile = async (_req, res) => {
  const profile = await Profile.findOne().lean();
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  res.json({ success: true, data: profile });
};