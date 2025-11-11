const { Router } = require('express');
const { models: { AuditLog } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { Op } = require('sequelize');

const router = Router();

/** Resumo agregado por ação/dia (ADMIN) — sem IDs de paciente/entidade */
router.get('/summary', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7*24*60*60*1000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();

    const rows = await AuditLog.findAll({
      where: { createdAt: { [Op.gte]: from, [Op.lte]: to } },
      order: [['createdAt', 'ASC']]
    });

    const out = {};
    for (const r of rows) {
      const day = r.createdAt.toISOString().slice(0,10);
      out[day] = out[day] || {};
      out[day][r.action] = (out[day][r.action] || 0) + 1;
    }
    res.json(out);
  } catch (e) { next(e); }
});

module.exports = router;
