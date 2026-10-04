const express = require('express');
const router = express.Router();
const { getSkills } = require('../controllers/skills.controller');
const { isDbConnected } = require('../middleware/db');

router.get('/', isDbConnected, getSkills);

module.exports = router;