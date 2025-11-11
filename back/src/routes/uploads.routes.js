const { Router } = require('express');
const { models: { ExamResult, User } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { upload } = require('../storage/local');
const { logAction } = require('../utils/audit');

const router = Router();

router.post('/upload', auth(), requireRole('PACIENTE', 'ATENDENTE', 'MEDICO'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    const { description, patientId } = req.body;

    let targetPatientId;
    if (req.user.role === 'PACIENTE') {
      targetPatientId = req.user.id;
    } else {
      if (!patientId) return res.status(400).json({ error: 'patientId é obrigatório' });
      const pat = await User.findByPk(Number(patientId));
      if (!pat || pat.role !== 'PACIENTE') return res.status(400).json({ error: 'patientId inválido' });
      targetPatientId = pat.id;
    }

    const created = await ExamResult.create({
      patientId: targetPatientId,
      uploadedByUserId: req.user.id,
      filePath: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      description: description || null
    });

    await logAction(req, { action: 'EXAM_UPLOAD', entityType: 'EXAM', entityId: created.id, meta: { patientId: targetPatientId, filename: created.filename } });

    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.get('/my', auth(), requireRole('PACIENTE'), async (req, res, next) => {
  try {
    const exams = await ExamResult.findAll({ where: { patientId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json(exams);
  } catch (e) { next(e); }
});

router.get('/patient/:patientId', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const patientId = Number(req.params.patientId);
    const exams = await ExamResult.findAll({ where: { patientId }, order: [['createdAt', 'DESC']] });

    await logAction(req, { action: 'EXAM_LIST_BY_PATIENT', entityType: 'USER', entityId: patientId });

    res.json(exams);
  } catch (e) { next(e); }
});

module.exports = router;
