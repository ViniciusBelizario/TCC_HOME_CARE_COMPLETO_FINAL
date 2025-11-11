const { Router } = require('express');
const authRoutes = require('./auth.routes');
const patientsRoutes = require('./patients.routes');
const doctorsRoutes = require('./doctors.routes');
const availabilityRoutes = require('./availability.routes');
const appointmentsRoutes = require('./appointments.routes');
const uploadsRoutes = require('./uploads.routes');
const reportsRoutes = require('./reports.routes');
const auditRoutes = require('./audit.routes'); // <— novo
const attendantsRoutes = require('./attendants.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientsRoutes);
router.use('/doctors', doctorsRoutes);
router.use('/availability', availabilityRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/exams', uploadsRoutes);
router.use('/reports', reportsRoutes);
router.use('/audit', auditRoutes); // <— novo
router.use('/attendants', attendantsRoutes);

module.exports = router;
