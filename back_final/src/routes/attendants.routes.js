// src/routes/attendants.routes.js
const { Router } = require('express');
const { models: { User } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { logAction } = require('../utils/audit');
const { Op, fn, col, where } = require('sequelize');

const router = Router();

/**
 * GET /attendants
 * Lista atendentes (somente ADMIN)
 * Exemplos:
 *  - /attendants?q=vinicius
 *  - /attendants?cpf=312
 *
 * Query params:
 *  - q: string livre (nome, email, cpf)
 *  - cpf: filtro direto por cpf (aceita parcial)
 *  - page: número (default 1)
 *  - pageSize: número (default 20, máx 100)
 *  - orderBy: 'name' | 'email' | 'cpf' | 'createdAt' (default 'name')
 *  - orderDir: 'ASC' | 'DESC' (default 'ASC')
 */
router.get('/', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const cpf = String(req.query.cpf || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);

    const allowedOrderBy = new Set(['name', 'email', 'cpf', 'createdAt']);
    const orderBy = allowedOrderBy.has(String(req.query.orderBy)) ? String(req.query.orderBy) : 'name';
    const orderDir = String(req.query.orderDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const whereClause = { role: 'ATENDENTE' };

    // Se veio cpf, prioriza o filtro direto por cpf
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
      order: [[orderBy, orderDir]],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    await logAction(req, {
      action: 'ATTENDANT_LIST',
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
 * GET /attendants/:id
 * Detalhe de uma atendente (somente ADMIN)
 */
router.get('/:id', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const attendant = await User.findOne({
      where: { id, role: 'ATENDENTE' },
      attributes: ['id', 'name', 'email', 'cpf', 'createdAt', 'updatedAt']
    });
    if (!attendant) return res.status(404).json({ error: 'Atendente não encontrada' });

    await logAction(req, { action: 'ATTENDANT_VIEW', entityType: 'USER', entityId: id });

    return res.json(attendant);
  } catch (e) { next(e); }
});

module.exports = router;
