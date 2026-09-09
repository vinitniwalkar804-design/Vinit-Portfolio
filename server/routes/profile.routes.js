const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/profile.controller');
const { isDbConnected } = require('../middleware/db');

router.get('/', isDbConnected, getProfile);

module.exports = router;