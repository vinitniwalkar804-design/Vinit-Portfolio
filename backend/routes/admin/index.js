const express = require('express');
const multer = require('multer');
const { requireAdmin, csrfGuard } = require('../../middleware/adminAuth');
const { isDbConnected } = require('../../middleware/db');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

// ------------------------------------------------------------------ auth --
router.use('/auth', require('./auth.routes'));

// ------------------------------------------- everything below is protected --
router.use(isDbConnected, requireAdmin, csrfGuard);

const MAX_CERT_MB = 15;
const MAX_RESUME_MB = 10;

const memory = multer.memoryStorage();

function pdfFilter(req, file, cb) {
  const okType = String(file.mimetype || '') === 'application/pdf' ||
    String(file.mimetype || '') === 'application/x-pdf' ||
    String(file.originalname || '').toLowerCase().endsWith('.pdf');
  if (okType) return cb(null, true);
  const err = new Error('Only PDF files are allowed.');
  err.fileTypeInvalid = true;
  cb(err);
}

const certUpload = multer({ storage: memory, limits: { fileSize: MAX_CERT_MB * 1024 * 1024, files: 1 }, fileFilter: pdfFilter });
const resumeUpload = multer({ storage: memory, limits: { fileSize: MAX_RESUME_MB * 1024 * 1024, files: 1 }, fileFilter: pdfFilter });

const profile = require('../../controllers/admin/profile.controller');
const projects = require('../../controllers/admin/projects.controller');
const certificates = require('../../controllers/admin/certificates.controller');
const resume = require('../../controllers/admin/resume.controller');
const skills = require('../../controllers/admin/skills.controller');
const education = require('../../controllers/admin/education.controller');
const experience = require('../../controllers/admin/experience.controller');
const messages = require('../../controllers/admin/messages.controller');

// ---------------------------------------------------------------- profile --
router.get('/profile', asyncHandler(profile.getProfile));
router.put('/profile', asyncHandler(profile.updateProfile));

// --------------------------------------------------------------- projects --
router.get('/projects', asyncHandler(projects.getProjects));
router.post('/projects', asyncHandler(projects.createProject));
router.put('/projects/reorder', asyncHandler(projects.reorderProjects));
router.put('/projects/:id', asyncHandler(projects.updateProject));
router.delete('/projects/:id', asyncHandler(projects.deleteProject));

// ---------------------------------------------------------- certificates --
router.get('/certificates', asyncHandler(certificates.getCertificates));
router.post('/certificates', asyncHandler(certificates.createCertificate));
router.put('/certificates/reorder', asyncHandler(certificates.reorderCertificates));
router.post('/certificates/:id/file', certUpload.single('pdf'), asyncHandler(certificates.uploadCertificateFile));
router.delete('/certificates/:id/file', asyncHandler(certificates.removeCertificateFile));
router.put('/certificates/:id', asyncHandler(certificates.updateCertificate));
router.delete('/certificates/:id', asyncHandler(certificates.deleteCertificate));

// ---------------------------------------------------------------- resume --
router.get('/resume', asyncHandler(resume.getMetadata));
router.post('/resume', resumeUpload.single('pdf'), asyncHandler(resume.uploadResume));

// ----------------------------------------------------------------- skills --
router.get('/skills', asyncHandler(skills.getSkills));
router.post('/skills', asyncHandler(skills.createSkill));
router.put('/skills/reorder', asyncHandler(skills.reorderSkills));
router.put('/skills/:id', asyncHandler(skills.updateSkill));
router.delete('/skills/:id', asyncHandler(skills.deleteSkill));

// -------------------------------------------------------------- education --
router.get('/education', asyncHandler(education.getEducation));
router.post('/education', asyncHandler(education.createEducation));
router.put('/education/reorder', asyncHandler(education.reorderEducation));
router.put('/education/:id', asyncHandler(education.updateEducation));
router.delete('/education/:id', asyncHandler(education.deleteEducation));

// ------------------------------------------------------------- experience --
router.get('/experience', asyncHandler(experience.getExperience));
router.post('/experience', asyncHandler(experience.createExperience));
router.put('/experience/reorder', asyncHandler(experience.reorderExperience));
router.put('/experience/:id', asyncHandler(experience.updateExperience));
router.delete('/experience/:id', asyncHandler(experience.deleteExperience));

// --------------------------------------------------------------- messages --
router.get('/messages', asyncHandler(messages.listMessages));
router.patch('/messages/:id', asyncHandler(messages.markRead));
router.delete('/messages/:id', asyncHandler(messages.deleteMessage));

module.exports = router;