// src/routes/uploads.routes.js
const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const { models: { ExamResult, User } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { upload } = require('../storage/local');
const { logAction } = require('../utils/audit');

const router = Router();

// ===== helpers =====
function canAccessExam(requester, exam) {
  if (!requester || !exam) return false;
  if (requester.role === 'PACIENTE') {
    return requester.id === exam.patientId;
  }
  // MÉDICO / ATENDENTE / ADMIN podem acessar exames de qualquer paciente
  if (requester.role === 'MEDICO' || requester.role === 'ATENDENTE' || requester.role === 'ADMIN') {
    return true;
  }
  return false;
}

function resolveExamAbsolutePath(filePath, storedFilenameFallback) {
  const base = path.basename(filePath || storedFilenameFallback || '');
  return path.join(process.cwd(), 'uploads', base);
}

// ===== UPLOAD =====
router.post(
  '/upload',
  auth(),
  requireRole('PACIENTE', 'ATENDENTE', 'MEDICO'),
  upload.single('file'),
  async (req, res, next) => {
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

      await logAction(req, {
        action: 'EXAM_UPLOAD',
        entityType: 'EXAM',
        entityId: created.id,
        meta: { patientId: targetPatientId, filename: created.filename }
      });

      res.status(201).json(created);
    } catch (e) { next(e); }
  }
);

// ===== LISTAGENS =====
router.get('/my', auth(), requireRole('PACIENTE'), async (req, res, next) => {
  try {
    const exams = await ExamResult.findAll({
      where: { patientId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(exams);
  } catch (e) { next(e); }
});

router.get('/patient/:patientId', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const patientId = Number(req.params.patientId);
    const exams = await ExamResult.findAll({
      where: { patientId },
      order: [['createdAt', 'DESC']]
    });

    await logAction(req, { action: 'EXAM_LIST_BY_PATIENT', entityType: 'USER', entityId: patientId });

    res.json(exams);
  } catch (e) { next(e); }
});

// ===== METADADOS =====
router.get('/:id', auth(), async (req, res, next) => {
  try {
    const exam = await ExamResult.findByPk(Number(req.params.id));
    if (!exam) return res.status(404).json({ error: 'Exame não encontrado' });

    if (!canAccessExam(req.user, exam)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    res.json(exam);
  } catch (e) { next(e); }
});

// ===== VISUALIZAR (inline) =====
router.get('/:id/view', auth(), async (req, res, next) => {
  try {
    const exam = await ExamResult.findByPk(Number(req.params.id));
    if (!exam) return res.status(404).json({ error: 'Exame não encontrado' });
    if (!canAccessExam(req.user, exam)) return res.status(403).json({ error: 'Permissão negada' });

    const absPath = resolveExamAbsolutePath(exam.filePath, exam.filename);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'Arquivo do exame não encontrado no servidor' });
    }

    if (exam.mimeType) res.type(exam.mimeType);
    await logAction(req, { action: 'EXAM_VIEW', entityType: 'EXAM', entityId: exam.id });

    return res.sendFile(absPath);
  } catch (e) { next(e); }
});

// ===== DOWNLOAD =====
router.get('/:id/download', auth(), async (req, res, next) => {
  try {
    const exam = await ExamResult.findByPk(Number(req.params.id));
    if (!exam) return res.status(404).json({ error: 'Exame não encontrado' });
    if (!canAccessExam(req.user, exam)) return res.status(403).json({ error: 'Permissão negada' });

    const absPath = resolveExamAbsolutePath(exam.filePath, exam.filename);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'Arquivo do exame não encontrado no servidor' });
    }

    await logAction(req, { action: 'EXAM_DOWNLOAD', entityType: 'EXAM', entityId: exam.id });
    return res.download(absPath, exam.filename || path.basename(absPath));
  } catch (e) { next(e); }
});

module.exports = router;
