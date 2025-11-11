// src/routes/observations.routes.js
const { Router } = require('express');
const { models: { User, UserObservation } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { logAction } = require('../utils/audit');

const router = Router();

async function ensurePatient(patientId) {
  const patient = await User.findByPk(patientId);
  if (!patient) throw new Error('Paciente não encontrado');
  if (patient.role !== 'PACIENTE') throw new Error('O usuário alvo não é um paciente');
  return patient;
}

router.post(
  '/patients/:patientId/observations',
  auth(),
  requireRole('MEDICO'),
  async (req, res) => {
    try {
      const doctor = req.user;
      const { patientId } = req.params;
      const { note } = req.body || {};
      if (!note || !String(note).trim()) return res.status(400).json({ error: 'note é obrigatório' });

      await ensurePatient(patientId);

      const created = await UserObservation.create({
        patientId: Number(patientId),
        doctorId: doctor.id,
        note: String(note).trim()
      });

      logAction(doctor.id, 'OBSERVATION_CREATE', { observationId: created.id, patientId });
      return res.status(201).json(created);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Erro ao criar observação' });
    }
  }
);

router.get(
  '/patients/:patientId/observations',
  auth(),
  async (req, res) => {
    try {
      const user = req.user;
      const { patientId } = req.params;

      await ensurePatient(patientId);

      const isDoctor = user.role === 'MEDICO';
      const isSelfPatient = user.role === 'PACIENTE' && Number(user.id) === Number(patientId);
      if (!(isDoctor || isSelfPatient)) return res.status(403).json({ error: 'Permissão negada' });

      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);

      const { rows, count } = await UserObservation.findAndCountAll({
        where: { patientId: Number(patientId) },
        include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'email'] }],
        order: [['createdAt', 'DESC']],
        offset: (page - 1) * pageSize,
        limit: pageSize
      });

      return res.json({ data: rows, page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Erro ao listar observações' });
    }
  }
);

router.put(
  '/observations/:id',
  auth(),
  requireRole('MEDICO'),
  async (req, res) => {
    try {
      const doctor = req.user;
      const { id } = req.params;
      const { note } = req.body || {};
      const obs = await UserObservation.findByPk(id);
      if (!obs) return res.status(404).json({ error: 'Observação não encontrada' });
      if (obs.doctorId !== doctor.id) return res.status(403).json({ error: 'Somente o médico autor pode editar' });
      if (!note || !String(note).trim()) return res.status(400).json({ error: 'note é obrigatório' });

      obs.note = String(note).trim();
      await obs.save();
      logAction(doctor.id, 'OBSERVATION_UPDATE', { observationId: obs.id });
      return res.json(obs);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Erro ao atualizar observação' });
    }
  }
);

router.delete(
  '/observations/:id',
  auth(),
  requireRole('MEDICO'),
  async (req, res) => {
    try {
      const doctor = req.user;
      const { id } = req.params;
      const obs = await UserObservation.findByPk(id);
      if (!obs) return res.status(404).json({ error: 'Observação não encontrada' });
      if (obs.doctorId !== doctor.id) return res.status(403).json({ error: 'Somente o médico autor pode excluir' });

      await obs.destroy(); // paranoid
      logAction(doctor.id, 'OBSERVATION_DELETE', { observationId: id });
      return res.status(204).send();
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Erro ao excluir observação' });
    }
  }
);

module.exports = router;
