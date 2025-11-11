// file: src/routes/availability.routes.js
const { Router } = require('express');
const { models: { AvailabilitySlot, User } } = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { toUTC, isISODate, isHHmm } = require('../utils/dates');
const { Op } = require('sequelize');
const { generateDailySlots } = require('../utils/slotGenerator');

const router = Router();

function asInt(x) {
  const n = Number(x);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

/**
 * Criar slot unitário – MÉDICO (para si) ou ATENDENTE (para um médico via doctorId)
 * Body: { startsAt, endsAt, doctorId? }
 */
router.post('/', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const { startsAt, endsAt, doctorId } = req.body;
    const start = toUTC(startsAt);
    const end = toUTC(endsAt);
    if (!start || !end || end <= start) return res.status(400).json({ error: 'Intervalo inválido' });

    let targetDoctorId;
    if (req.user.role === 'MEDICO') {
      targetDoctorId = req.user.id;
      if (doctorId && asInt(doctorId) !== req.user.id) return res.status(403).json({ error: 'Médico só pode criar slots para si' });
    } else {
      const did = asInt(doctorId);
      if (!doctorId || Number.isNaN(did)) return res.status(400).json({ error: 'doctorId é obrigatório e deve ser inteiro' });
      const doc = await User.findByPk(did);
      if (!doc || doc.role !== 'MEDICO') return res.status(400).json({ error: 'doctorId inválido' });
      targetDoctorId = doc.id;
    }

    const overlap = await AvailabilitySlot.findOne({
      where: {
        doctorId: targetDoctorId,
        startsAt: { [Op.lt]: end },
        endsAt:   { [Op.gt]: start }
      }
    });
    if (overlap) return res.status(400).json({ error: 'Já existe um slot nesse intervalo' });

    const slot = await AvailabilitySlot.create({ doctorId: targetDoctorId, startsAt: start, endsAt: end });
    res.status(201).json(slot);
  } catch (e) { next(e); }
});

/**
 * ABRIR AGENDA DO DIA – ATENDENTE ou MÉDICO
 * Body: {
 *   date: "YYYY-MM-DD",
 *   startTime: "HH:mm",
 *   endTime:   "HH:mm",
 *   durationMin: number,
 *   doctorId?: number
 * }
 */
router.post('/day-openings', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  const t = await AvailabilitySlot.sequelize.transaction();
  try {
    const { date, startTime, endTime } = req.body;
    const durationMin = Number(req.body.durationMin);

    if (!isISODate(date) || !isHHmm(startTime) || !isHHmm(endTime)) {
      await t.rollback();
      return res.status(400).json({ error: 'date/startTime/endTime inválidos' });
    }
    if (!Number.isFinite(durationMin) || durationMin < 5 || durationMin > 480) {
      await t.rollback();
      return res.status(400).json({ error: 'durationMin deve ser número entre 5 e 480' });
    }

    let targetDoctorId;
    if (req.user.role === 'MEDICO') {
      const did = req.body.doctorId !== undefined ? asInt(req.body.doctorId) : req.user.id;
      if (!Number.isNaN(did) && did !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: 'Médico só pode abrir agenda para si' });
      }
      targetDoctorId = req.user.id;
    } else {
      const did = asInt(req.body.doctorId);
      if (Number.isNaN(did)) {
        await t.rollback();
        return res.status(400).json({ error: 'doctorId é obrigatório e deve ser inteiro' });
      }
      const doc = await User.findByPk(did);
      if (!doc || doc.role !== 'MEDICO') {
        await t.rollback();
        return res.status(400).json({ error: 'doctorId inválido' });
      }
      targetDoctorId = doc.id;
    }

    const generated = generateDailySlots({
      dateISO: date,
      startTime,
      endTime,
      durationMin
    });

    if (generated.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Nenhum slot gerado (verifique horários/duração)' });
    }

    const results = [];
    for (const { start, end } of generated) {
      const overlap = await AvailabilitySlot.findOne({
        where: {
          doctorId: targetDoctorId,
          startsAt: { [Op.lt]: end },
          endsAt:   { [Op.gt]: start }
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!overlap) {
        const created = await AvailabilitySlot.create(
          { doctorId: targetDoctorId, startsAt: start, endsAt: end },
          { transaction: t }
        );
        results.push(created);
      }
    }

    await t.commit();
    return res.status(201).json({
      generated: generated.length,
      created: results.length,
      skipped: generated.length - results.length,
      slots: results
    });
  } catch (e) {
    await t.rollback();
    next(e);
  }
});

/** Listar slots livres (público) – filtro por médico e período */
router.get('/', auth(false), async (req, res, next) => {
  try {
    const did = req.query.doctorId !== undefined ? asInt(req.query.doctorId) : undefined;
    if (req.query.doctorId !== undefined && Number.isNaN(did)) {
      return res.status(400).json({ error: 'doctorId inválido' });
    }

    const from = req.query.from ? toUTC(String(req.query.from)) : undefined;
    const to = req.query.to ? toUTC(String(req.query.to)) : undefined;
    if (req.query.from && !from) return res.status(400).json({ error: 'from inválido' });
    if (req.query.to && !to) return res.status(400).json({ error: 'to inválido' });

    const where = {
      ...(did ? { doctorId: did } : {}),
      ...(from ? { startsAt: { [Op.gte]: from } } : {}),
      ...(to ? { endsAt: { [Op.lte]: to } } : {}),
      isBooked: false
    };

    const slots = await AvailabilitySlot.findAll({ where, order: [['startsAt', 'ASC']] });
    res.json(slots);
  } catch (e) { next(e); }
});

/**
 * ⚠️ IMPORTANTE: coloque /unused ANTES de /:id para não casar como ID
 * Apagar slots NÃO utilizados por intervalo
 * Body: { from: ISODateTime, to: ISODateTime, doctorId?: number }
 */
router.delete('/unused', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const start = toUTC(req.body.from);
    const end = toUTC(req.body.to);
    if (!start || !end || end <= start) return res.status(400).json({ error: 'Intervalo inválido' });

    let targetDoctorId;
    if (req.user.role === 'MEDICO') {
      if (req.body.doctorId && asInt(req.body.doctorId) !== req.user.id) {
        return res.status(403).json({ error: 'Médico só pode apagar slots seus' });
      }
      targetDoctorId = req.user.id;
    } else {
      const did = asInt(req.body.doctorId);
      if (Number.isNaN(did)) return res.status(400).json({ error: 'doctorId é obrigatório e deve ser inteiro' });
      const doc = await User.findByPk(did);
      if (!doc || doc.role !== 'MEDICO') return res.status(400).json({ error: 'doctorId inválido' });
      targetDoctorId = doc.id;
    }

    const where = {
      doctorId: targetDoctorId,
      isBooked: false,
      startsAt: { [Op.gte]: start },
      endsAt:   { [Op.lte]: end }
    };

    const count = await AvailabilitySlot.destroy({ where });
    res.json({ deleted: count });
  } catch (e) { next(e); }
});

/**
 * Apagar slot não utilizado por ID (somente dígitos)
 * Usa regex para não confundir com /unused
 */
router.delete('/:id(\\d+)', auth(), requireRole('MEDICO', 'ATENDENTE'), async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    const slot = await AvailabilitySlot.findByPk(id);
    if (!slot) return res.status(404).json({ error: 'Slot não encontrado' });
    if (slot.isBooked) return res.status(400).json({ error: 'Não é possível excluir um slot já agendado' });

    if (req.user.role === 'MEDICO' && slot.doctorId !== req.user.id) {
      return res.status(403).json({ error: 'Sem permissão para excluir slot de outro médico' });
    }

    await slot.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
