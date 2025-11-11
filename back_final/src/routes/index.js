// src/routes/index.js
const { Router } = require('express');

const authRoutes = require('./auth.routes');
const patientsRoutes = require('./patients.routes');
const doctorsRoutes = require('./doctors.routes');
const availabilityRoutes = require('./availability.routes');
const appointmentsRoutes = require('./appointments.routes');
const uploadsRoutes = require('./uploads.routes');
const reportsRoutes = require('./reports.routes');
const auditRoutes = require('./audit.routes');
const attendantsRoutes = require('./attendants.routes');
const observationsRoutes = require('./observations.routes');

// NOVO: rotas de senha (reset)
const passwordRoutes = require('./password.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientsRoutes);
router.use('/doctors', doctorsRoutes);
router.use('/availability', availabilityRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/exams', uploadsRoutes);
router.use('/reports', reportsRoutes);
router.use('/audit', auditRoutes);
router.use('/attendants', attendantsRoutes);

// Observações
router.use('/', observationsRoutes);

// Senhas (reset/change)
router.use('/', passwordRoutes);

module.exports = router;
