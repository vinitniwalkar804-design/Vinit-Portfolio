const express = require('express');
const router = express.Router();
const { getEducation } = require('../controllers/education.controller');
const { isDbConnected } = require('../middleware/db');

router.get('/', isDbConnected, getEducation);

module.exports = router;