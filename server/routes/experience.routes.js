const express = require('express');
const router = express.Router();
const { getExperience } = require('../controllers/experience.controller');
const { isDbConnected } = require('../middleware/db');

router.get('/', isDbConnected, getExperience);

module.exports = router;