const express = require('express');
const router = express.Router();
const { getProjects } = require('../controllers/projects.controller');
const { isDbConnected } = require('../middleware/db');

router.get('/', isDbConnected, getProjects);

module.exports = router;