const express = require('express');
const router = express.Router();
const { getCertificates } = require('../controllers/certificates.controller');
const { isDbConnected } = require('../middleware/db');

router.get('/', isDbConnected, getCertificates);

module.exports = router;