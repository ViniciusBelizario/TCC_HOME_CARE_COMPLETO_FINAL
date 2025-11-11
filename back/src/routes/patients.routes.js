// src/routes/patients.routes.js
const { Router } = require('express');
const { models: { User, PatientProfile, ExamResult } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { logAction } = require('../utils/audit');
const { Op, fn, col, where } = require('sequelize');

const router = Router();

/**
 * GET /patients
 * Lista pacientes (apenas MEDICO e ATENDENTE)
 * Exemplos:
 *  - /patients?q=vini
 *  - /patients?cpf=422
 *
 * Query params:
 *  - q: string livre (nome, email, cpf)
 *  - cpf: filtro direto por cpf (aceita parcial)
 *  - page: número (default 1)
 *  - pageSize: número (default 20, máx 100)
 *  - orderBy: 'name' | 'email' | 'cpf' | 'createdAt' (default 'name')
 *  - orderDir: 'ASC' | 'DESC' (default 'ASC')
 */
router.get('/', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const cpf = String(req.query.cpf || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);

    const allowedOrderBy = new Set(['name', 'email', 'cpf', 'createdAt']);
    const orderBy = allowedOrderBy.has(String(req.query.orderBy)) ? String(req.query.orderBy) : 'name';
    const orderDir = String(req.query.orderDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const whereClause = { role: 'PACIENTE' };

    if (cpf) {
      whereClause[Op.and] = [{ cpf: { [Op.like]: `%${cpf}%` } }];
    } else if (q) {
      whereClause[Op.or] = [
        where(fn('LOWER', col('name')), { [Op.like]: `%${q.toLowerCase()}%` }),
        where(fn('LOWER', col('email')), { [Op.like]: `%${q.toLowerCase()}%` }),
        { cpf: { [Op.like]: `%${q}%` } }
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'cpf', 'createdAt', 'updatedAt'],
      include: [{ model: PatientProfile, as: 'patientProfile' }],
      order: [[orderBy, orderDir]],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    await logAction(req, {
      action: 'PATIENT_LIST',
      entityType: 'USER',
      entityId: null,
      meta: { q: q || null, cpf: cpf || null, page, pageSize, orderBy, orderDir }
    });

    return res.json({
      items: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(count / pageSize), 1)
    });
  } catch (e) { next(e); }
});

/**
 * GET /patients/:id
 * Detalhe do paciente (apenas MEDICO e ATENDENTE)
 */
router.get('/:id', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const patient = await User.findOne({
      where: { id, role: 'PACIENTE' },
      include: [
        { model: PatientProfile, as: 'patientProfile' },
        { model: ExamResult, as: 'patientExams' }
      ]
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await logAction(req, { action: 'PATIENT_VIEW', entityType: 'USER', entityId: id });

    res.json(patient);
  } catch (e) { next(e); }
});

/**
 * PUT /patients/:id
 * Atualização de dados do paciente (apenas MEDICO e ATENDENTE)
 */
router.put('/:id', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, email, cpf, phone, address, birthDate } = req.body;

    const patient = await User.findOne({ where: { id, role: 'PACIENTE' } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    if (name || email || cpf) {
      if (name) patient.name = name;
      if (email) patient.email = email;
      if (cpf) patient.cpf = cpf;
      await patient.save();
    }

    const prof = await PatientProfile.findOne({ where: { userId: id } });
    if (prof) {
      if (phone !== undefined) prof.phone = phone;
      if (address !== undefined) prof.address = address;
      if (birthDate !== undefined) prof.birthDate = birthDate ? new Date(birthDate) : null;
      await prof.save();
    }

    await logAction(req, { action: 'PATIENT_UPDATE', entityType: 'USER', entityId: id, meta: { changed: Object.keys(req.body || {}) } });

    const updated = await User.findByPk(id, { include: ['patientProfile'] });
    res.json(updated);
  } catch (e) { next(e); }
});

module.exports = router;
