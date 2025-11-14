// src/routes/doctors.routes.js
const { Router } = require('express');
const { models: { User, DoctorProfile } } = require('../db');
const { auth } = require('../middlewares/auth');
const { Op, fn, col, where } = require('sequelize');

const router = Router();

/**
 * GET /doctors
 * Lista médicos (público)
 * Exemplos:
 *  - /doctors?q=A
 *  - /doctors?cpf=11
 *
 * Query params:
 *  - q: string livre (nome, email, crm, cpf)
 *  - cpf: filtro direto por cpf (aceita parcial)
 *  - page: número (default 1)
 *  - pageSize: número (default 20, máx 100)
 *  - orderBy: 'name' | 'email' | 'cpf' | 'createdAt' (default 'name')
 *  - orderDir: 'ASC' | 'DESC' (default 'ASC')
 */
router.get('/', auth(false), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const cpf = String(req.query.cpf || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);

    const allowedOrderBy = new Set(['name', 'email', 'cpf', 'createdAt']);
    const orderBy = allowedOrderBy.has(String(req.query.orderBy)) ? String(req.query.orderBy) : 'name';
    const orderDir = String(req.query.orderDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const whereClause = { role: 'MEDICO' };

    if (cpf) {
      whereClause[Op.and] = [{ cpf: { [Op.like]: `%${cpf}%` } }];
    } else if (q) {
      whereClause[Op.or] = [
        where(fn('LOWER', col('name')), { [Op.like]: `%${q.toLowerCase()}%` }),
        where(fn('LOWER', col('email')), { [Op.like]: `%${q.toLowerCase()}%` }),
        { cpf: { [Op.like]: `%${q}%` } },
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'cpf', 'createdAt', 'updatedAt'],
      include: [{
        model: DoctorProfile,
        as: 'doctorProfile',
        // Agora retorna também o COREN, sem mudar o resto
        attributes: ['crm', 'coren', 'specialty']
      }],
      order: [[orderBy, orderDir]],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    return res.json({
      items: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(count / pageSize), 1)
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
