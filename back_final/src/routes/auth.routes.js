// src/routes/auth.routes.js
const { Router } = require('express');
const { models: { User, PatientProfile, DoctorProfile } } = require('../db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signJwt } = require('../utils/jwt');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { logAction } = require('../utils/audit');

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, cpf, password } = req.body;
    if (!password || (!email && !cpf)) {
      return res.status(400).json({ error: 'Informe email ou cpf + password' });
    }

    const where = {};
    if (email) where.email = email;
    else if (cpf) where.cpf = cpf;

    const user = await User.findOne({ where });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = signJwt({ id: user.id, role: user.role });

    // log de login
    await logAction(req, {
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      meta: { by: email ? 'email' : 'cpf' }
    });

    // Retorna mustChangePassword para o front forçar troca no primeiro acesso
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (e) { next(e); }
});

router.get('/me', auth(), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { include: ['patientProfile', 'doctorProfile'] });
    res.json(user);
  } catch (e) { next(e); }
});

router.post('/register', (_req, res) => {
  return res.status(403).json({ error: 'Cadastro público desativado. Use rotas de staff.' });
});

router.post('/register/patient', auth(), requireRole('ATENDENTE'), async (req, res, next) => {
  try {
    const { name, email, cpf, password, phone, address, birthDate } = req.body;
    const passwordHash = await hashPassword(password || 'paciente123');
    const user = await User.create({
      name,
      email,
      cpf,
      passwordHash,
      role: 'PACIENTE',
      mustChangePassword: true // força troca no primeiro login
    });
    await PatientProfile.create({
      userId: user.id,
      phone: phone || null,
      address: address || null,
      birthDate: birthDate ? new Date(birthDate) : null
    });

    await logAction(req, {
      action: 'USER_CREATE',
      entityType: 'USER',
      entityId: user.id,
      meta: { createdRole: 'PACIENTE' }
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (e) { next(e); }
});

router.post('/register/doctor', auth(), requireRole('ATENDENTE', 'ADMIN'), async (req, res, next) => {
  try {
    const { name, email, cpf, password, specialty, crm } = req.body;
    if (!specialty || !crm) return res.status(400).json({ error: 'specialty e crm são obrigatórios' });

    const passwordHash = await hashPassword(password || 'medico123');
    const user = await User.create({
      name,
      email,
      cpf,
      passwordHash,
      role: 'MEDICO',
      mustChangePassword: true // força troca no primeiro login
    });
    await DoctorProfile.create({ userId: user.id, specialty, crm });

    await logAction(req, {
      action: 'USER_CREATE',
      entityType: 'USER',
      entityId: user.id,
      meta: { createdRole: 'MEDICO' }
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (e) { next(e); }
});

router.post('/register/attendant', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, email, cpf, password } = req.body;
    const passwordHash = await hashPassword(password || 'atendente123');
    const user = await User.create({
      name,
      email,
      cpf,
      passwordHash,
      role: 'ATENDENTE',
      mustChangePassword: true // força troca no primeiro login
    });

    await logAction(req, {
      action: 'USER_CREATE',
      entityType: 'USER',
      entityId: user.id,
      meta: { createdRole: 'ATENDENTE' }
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (e) { next(e); }
});

/**
 * Trocar a própria senha (primeiro acesso ou comum)
 * POST /auth/change-password
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', auth(), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword e newPassword são obrigatórios' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Senha atual inválida' });

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Nova senha deve ter ao menos 8 caracteres' });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();

    await logAction(req, {
      action: 'USER_PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: user.id,
      meta: { self: true }
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (e) { next(e); }
});

module.exports = router;
