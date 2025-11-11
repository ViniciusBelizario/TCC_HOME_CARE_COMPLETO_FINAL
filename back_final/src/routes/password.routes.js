// src/routes/password.routes.js
const { Router } = require('express');
const { models: { User } } = require('../db');
const { auth } = require('../middlewares/auth');
const { logAction } = require('../utils/audit');
const { hashPassword } = require('../utils/password');

const router = Router();

function defaultPasswordByRole(role) {
  switch (role) {
    case 'PACIENTE': return 'paciente123';
    case 'MEDICO': return 'medico123';
    case 'ATENDENTE': return 'atendente123';
    default: return 'paciente123';
  }
}

/**
 * Resetar senha de outro usuário:
 * - ATENDENTE → PACIENTE
 * - ADMIN → MEDICO ou ATENDENTE
 * POST /users/:userId/reset-password
 */
router.post('/users/:userId/reset-password', auth(), async (req, res, next) => {
  try {
    const requester = req.user;
    const { userId } = req.params;

    const target = await User.findByPk(userId);
    if (!target) return res.status(404).json({ error: 'Usuário alvo não encontrado' });

    if (requester.role === 'ATENDENTE') {
      if (target.role !== 'PACIENTE') {
        return res.status(403).json({ error: 'Atendente só pode resetar senha de paciente' });
      }
    } else if (requester.role === 'ADMIN') {
      if (!['MEDICO', 'ATENDENTE'].includes(target.role)) {
        return res.status(403).json({ error: 'Admin só pode resetar senha de médico ou atendente' });
      }
    } else {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    const defaultPass = defaultPasswordByRole(target.role);
    target.passwordHash = await hashPassword(defaultPass);
    target.mustChangePassword = true;
    await target.save();

    await logAction(req, {
      action: 'USER_PASSWORD_RESET',
      entityType: 'USER',
      entityId: target.id,
      meta: { targetRole: target.role }
    });

    return res.json({
      message: 'Senha resetada. O usuário deverá alterá-la no próximo acesso.',
      targetUserId: target.id,
      targetRole: target.role,
      temporaryPasswordHint: `${target.role.toLowerCase()}123`
    });
  } catch (e) { next(e); }
});

module.exports = router;
