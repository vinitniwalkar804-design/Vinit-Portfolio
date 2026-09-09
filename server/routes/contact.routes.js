const express = require('express');
const router = express.Router();
const { submitContact } = require('../controllers/contact.controller');
const { isDbConnected } = require('../middleware/db');

router.post('/', isDbConnected, submitContact);

module.exports = router;