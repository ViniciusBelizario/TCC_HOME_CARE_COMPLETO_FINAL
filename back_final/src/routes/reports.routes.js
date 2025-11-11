// file: src/routes/reports.routes.js
const { Router } = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { stringify } = require('csv-stringify');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const {
  models: { Appointment, User, AvailabilitySlot, ExamResult }
} = require('../db');

const router = Router();

/** Utils */
function toDateSafe(v) {
  if (!v) return undefined;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
}
function setCSV(res, filename) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}
function ensureModel(model, name) {
  if (!model) {
    const err = new Error(`${name} não está carregado nos models`);
    err.status = 501;
    throw err;
  }
}
function parseCommonQuery(req) {
  const from = toDateSafe(req.query.from);
  const to = toDateSafe(req.query.to);
  const format = String(req.query.format || 'json').toLowerCase();
  const doctorId = req.query.doctorId ? Number(req.query.doctorId) : undefined;
  return { from, to, format, doctorId };
}

/**
 * 1) KPIs gerais (ADMIN)
 */
router.get('/kpis', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');
    const { from, to } = parseCommonQuery(req);

    const whereAppt = {};
    if (from) whereAppt.startsAt = { [Op.gte]: from };
    if (to) whereAppt.endsAt = { ...(whereAppt.endsAt || {}), [Op.lte]: to };

    const appts = await Appointment.findAll({
      where: whereAppt,
      attributes: [
        'id', 'status', 'startsAt', 'endsAt',
        [fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt')), 'durationMin']
      ],
      raw: true
    });

    const kpi = {
      total: 0, requested: 0, accepted: 0, denied: 0, canceled: 0, completed: 0,
      avgDurationMin: null,
      revenueEstimated: null, // sem serviços
      utilizationRate: null
    };

    let sumDuration = 0, countDuration = 0;
    for (const a of appts) {
      kpi.total += 1;
      const st = String(a.status || '').toUpperCase();
      if (st === 'REQUESTED' || st === 'PENDING') kpi.requested += 1;
      else if (st === 'ACCEPTED' || st === 'CONFIRMED') kpi.accepted += 1;
      else if (st === 'DENIED') kpi.denied += 1;
      else if (st === 'CANCELED' || st === 'CANCELLED') kpi.canceled += 1;
      else if (st === 'COMPLETED') kpi.completed += 1;

      const d = Number(a.durationMin);
      if (Number.isFinite(d) && d > 0) { sumDuration += d; countDuration += 1; }
    }
    kpi.avgDurationMin = countDuration ? Math.round(sumDuration / countDuration) : null;

    // Taxa de ocupação (slots)
    try {
      ensureModel(AvailabilitySlot, 'AvailabilitySlot');
      const whereSlot = {};
      if (from) whereSlot.startsAt = { [Op.gte]: from };
      if (to) whereSlot.endsAt = { ...(whereSlot.endsAt || {}), [Op.lte]: to };
      const slots = await AvailabilitySlot.findAll({
        where: whereSlot,
        attributes: [
          [fn('SUM', fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt'))), 'totalMin'],
          [fn('SUM', literal(`CASE WHEN isBooked THEN TIMESTAMPDIFF(MINUTE, startsAt, endsAt) ELSE 0 END`)), 'bookedMin']
        ],
        raw: true
      });
      const totalMin = Number(slots[0]?.totalMin || 0);
      const bookedMin = Number(slots[0]?.bookedMin || 0);
      kpi.utilizationRate = totalMin > 0 ? bookedMin / totalMin : null;
    } catch {
      kpi.utilizationRate = null;
    }

    return res.json(kpi);
  } catch (e) { next(e); }
});

/**
 * 2) Consultas por dia (ADMIN): simples e direto
 *    Parâmetros: from, to, doctorId?, format=json|csv
 *    Agrupa por DATE(startsAt) e doctorId.
 */
router.get('/appointments/aggregate', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');
    const { from, to, format, doctorId } = parseCommonQuery(req);

    const whereAppt = {};
    if (from) whereAppt.startsAt = { [Op.gte]: from };
    if (to) whereAppt.endsAt = { ...(whereAppt.endsAt || {}), [Op.lte]: to };
    if (doctorId) whereAppt.doctorId = doctorId;

    // period = DATE(startsAt)
    const period = literal('DATE(`startsAt`)');

    const rows = await Appointment.findAll({
      where: whereAppt,
      attributes: [
        [period, 'period'],
        'doctorId',
        [fn('SUM', literal(`CASE WHEN status IN ('REQUESTED','PENDING') THEN 1 ELSE 0 END`)), 'requested'],
        [fn('SUM', literal(`CASE WHEN status IN ('ACCEPTED','CONFIRMED') THEN 1 ELSE 0 END`)), 'accepted'],
        [fn('SUM', literal(`CASE WHEN status='DENIED' THEN 1 ELSE 0 END`)), 'denied'],
        [fn('SUM', literal(`CASE WHEN status IN ('CANCELED','CANCELLED') THEN 1 ELSE 0 END`)), 'canceled'],
        [fn('SUM', literal(`CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END`)), 'completed'],
        [fn('COUNT', col('id')), 'total'],
        [fn('AVG', fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt'))), 'avgDurationMin']
      ],
      group: ['period', 'doctorId'],
      order: [[literal('period'), 'ASC']],
      raw: true
    });

    // nomes dos médicos (sem join pesado)
    const docIds = [...new Set(rows.map(r => r.doctorId).filter(Boolean))];
    const nameMap = {};
    if (docIds.length) {
      const docs = await User.findAll({ where: { id: docIds }, attributes: ['id', 'name'], raw: true });
      for (const d of docs) nameMap[d.id] = d.name;
    }

    const data = rows.map(r => ({
      period: r.period, // yyyy-mm-dd
      doctorId: Number(r.doctorId),
      doctor: nameMap[r.doctorId] || null,
      requested: Number(r.requested || 0),
      accepted: Number(r.accepted || 0),
      denied: Number(r.denied || 0),
      canceled: Number(r.canceled || 0),
      completed: Number(r.completed || 0),
      total: Number(r.total || 0),
      avgDurationMin: r.avgDurationMin != null ? Math.round(Number(r.avgDurationMin)) : null,
      completionRate: Number(r.total || 0) ? Number(r.completed || 0) / Number(r.total) : null
    }));

    if (format === 'csv') {
      setCSV(res, 'appointments_aggregate.csv');
      stringify(data, { header: true }).pipe(res);
      return;
    }
    return res.json(data);
  } catch (e) { next(e); }
});

/**
 * 3) Produtividade por médico (ADMIN)
 */
router.get('/doctors/utilization', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');
    ensureModel(AvailabilitySlot, 'AvailabilitySlot');
    const { from, to, format } = parseCommonQuery(req);

    const whereAppt = {};
    if (from) whereAppt.startsAt = { [Op.gte]: from };
    if (to) whereAppt.endsAt = { ...(whereAppt.endsAt || {}), [Op.lte]: to };

    const whereSlot = {};
    if (from) whereSlot.startsAt = { [Op.gte]: from };
    if (to) whereSlot.endsAt = { ...(whereSlot.endsAt || {}), [Op.lte]: to };

    const apptAgg = await Appointment.findAll({
      where: whereAppt,
      attributes: [
        'doctorId',
        [fn('COUNT', col('id')), 'appointments'],
        [fn('SUM', fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt'))), 'minutesBooked']
      ],
      group: ['doctorId'],
      raw: true
    });

    const slotAgg = await AvailabilitySlot.findAll({
      where: whereSlot,
      attributes: [
        'doctorId',
        [fn('SUM', fn('TIMESTAMPDIFF', literal('MINUTE'), col('startsAt'), col('endsAt'))), 'minutesAvailable'],
        [fn('SUM', literal(`CASE WHEN isBooked THEN TIMESTAMPDIFF(MINUTE, startsAt, endsAt) ELSE 0 END`)), 'minutesBookedFlag']
      ],
      group: ['doctorId'],
      raw: true
    });

    const map = new Map();
    for (const a of apptAgg) {
      map.set(a.doctorId, {
        doctorId: a.doctorId,
        appointments: Number(a.appointments || 0),
        minutesBookedByAppt: Number(a.minutesBooked || 0),
        minutesAvailable: 0,
        minutesBookedBySlots: 0
      });
    }
    for (const s of slotAgg) {
      const row = map.get(s.doctorId) || {
        doctorId: s.doctorId,
        appointments: 0,
        minutesBookedByAppt: 0,
        minutesAvailable: 0,
        minutesBookedBySlots: 0
      };
      row.minutesAvailable = Number(s.minutesAvailable || 0);
      row.minutesBookedBySlots = Number(s.minutesBookedFlag || 0);
      map.set(s.doctorId, row);
    }

    const result = Array.from(map.values());
    const ids = result.map(r => r.doctorId).filter(Boolean);
    if (ids.length) {
      const docs = await User.findAll({ where: { id: ids }, attributes: ['id', 'name'], raw: true });
      const nameMap = new Map(docs.map(d => [d.id, d.name]));
      result.forEach(r => (r.doctor = nameMap.get(r.doctorId) || null));
    } else {
      result.forEach(r => (r.doctor = null));
    }

    result.forEach(r => {
      r.utilizationRate = r.minutesAvailable > 0 ? r.minutesBookedBySlots / r.minutesAvailable : null;
      r.avgApptsPerDay = null;
    });

    if (format === 'csv') {
      setCSV(res, 'doctors_utilization.csv');
      stringify(result, { header: true }).pipe(res);
      return;
    }
    return res.json(result);
  } catch (e) { next(e); }
});

/**
 * 4) Retenção de pacientes (ADMIN)
 */
router.get('/patients/retention', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');

    const from = toDateSafe(req.query.from);
    const to = toDateSafe(req.query.to);
    if (!from || !to || to <= from) {
      return res.status(400).json({ error: 'from/to inválidos' });
    }

    const appts = await Appointment.findAll({
      where: { startsAt: { [Op.gte]: from }, endsAt: { [Op.lte]: to } },
      attributes: ['patientId'],
      group: ['patientId'],
      raw: true
    });
    const patientIds = appts.map(a => a.patientId);

    let newcomers = 0, returning = 0;
    if (patientIds.length) {
      const firsts = await Appointment.findAll({
        where: { patientId: patientIds },
        attributes: ['patientId', [fn('MIN', col('startsAt')), 'firstStart']],
        group: ['patientId'],
        raw: true
      });
      const firstMap = new Map(firsts.map(f => [f.patientId, new Date(f.firstStart)]));
      for (const pid of patientIds) {
        const first = firstMap.get(pid);
        if (first && first >= from && first <= to) newcomers++;
        else returning++;
      }
    }

    const result = { newcomers, returning };

    const baselineFrom = toDateSafe(req.query.baselineFrom);
    const baselineTo = toDateSafe(req.query.baselineTo);
    if (baselineFrom && baselineTo && baselineTo > baselineFrom) {
      const base = await Appointment.findAll({
        where: { startsAt: { [Op.gte]: baselineFrom }, endsAt: { [Op.lte]: baselineTo } },
        attributes: ['patientId'],
        group: ['patientId'],
        raw: true
      });
      const baseSet = new Set(base.map(b => b.patientId));
      const periodSet = new Set(patientIds);
      let churn = 0;
      for (const pid of baseSet) if (!periodSet.has(pid)) churn++;
      result.churnApprox = churn;
    }

    return res.json(result);
  } catch (e) { next(e); }
});

/**
 * 5) Exames (ADMIN): ExamResult + uploadedBy
 */
router.get('/exams/summary', auth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    ensureModel(ExamResult, 'ExamResult');
    const { from, to, format } = parseCommonQuery(req);

    const whereExam = {};
    if (from) whereExam.createdAt = { [Op.gte]: from };
    if (to) whereExam.createdAt = { ...(whereExam.createdAt || {}), [Op.lte]: to };

    const byMime = await ExamResult.findAll({
      where: whereExam,
      attributes: ['mimeType', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('size')), 'totalBytes']],
      group: ['mimeType'],
      raw: true
    });

    const uploads = await ExamResult.findAll({
      where: whereExam,
      include: [{ association: ExamResult.associations.uploadedBy, attributes: ['role'] }],
      attributes: [],
      raw: true
    });
    const byRole = {};
    for (const u of uploads) {
      const role = u['uploadedBy.role'] || 'UNKNOWN';
      byRole[role] = (byRole[role] || 0) + 1;
    }

    const data = {
      byMime: byMime.map(r => ({
        mimeType: r.mimeType,
        count: Number(r.count || 0),
        totalMB: r.totalBytes ? +(Number(r.totalBytes) / (1024 * 1024)).toFixed(2) : 0
      })),
      byRole
    };

    if (format === 'csv') {
      setCSV(res, 'exams_summary.csv');
      stringify(
        data.byMime.map(x => ({ mimeType: x.mimeType, count: x.count, totalMB: x.totalMB })),
        { header: true }
      ).pipe(res);
      return;
    }
    return res.json(data);
  } catch (e) { next(e); }
});

/**
 * 6) Detalhado/Aggregado simples (sem service)
 */
router.get('/appointments/detailed', auth(), requireRole('MEDICO', 'ATENDENTE', 'ADMIN'), async (req, res, next) => {
  try {
    ensureModel(Appointment, 'Appointment');
    const { from, to, format, doctorId } = parseCommonQuery(req);

    const whereAppt = {};
    if (from) whereAppt.startsAt = { [Op.gte]: from };
    if (to) whereAppt.endsAt = { ...(whereAppt.endsAt || {}), [Op.lte]: to };
    if (doctorId) whereAppt.doctorId = doctorId;

    const rows = await Appointment.findAll({
      where: whereAppt,
      order: [['startsAt', 'ASC']],
      include: [
        { association: Appointment.associations.doctor, attributes: ['id', 'name'] },
        { association: Appointment.associations.patient, attributes: ['id', 'name'] }
      ]
    });

    if (req.user.role === 'ADMIN') {
      const agg = {};
      for (const d of rows) {
        const key = `${d.doctorId}|${d.doctor?.name || ''}`;
        if (!agg[key]) {
          agg[key] = {
            doctorId: d.doctorId,
            doctor: d.doctor?.name || '',
            requested: 0, accepted: 0, denied: 0, canceled: 0, completed: 0,
            total: 0
          };
        }
        const st = String(d.status || '').toUpperCase();
        const k = (st === 'PENDING' ? 'requested'
                 : st === 'CONFIRMED' ? 'accepted'
                 : st === 'CANCELLED' ? 'canceled'
                 : st === 'CANCELED' ? 'canceled'
                 : st.toLowerCase());
        agg[key][k] = (agg[key][k] || 0) + 1;
        agg[key].total += 1;
      }
      const summary = Object.values(agg);

      if (format === 'csv') {
        setCSV(res, 'appointments_admin_agg.csv');
        stringify(summary, { header: true }).pipe(res);
        return;
      }
      return res.json(summary);
    }

    // Médico/Atendente: detalhado
    const data = rows.map(d => ({
      id: d.id,
      doctorId: d.doctor?.id,
      doctor: d.doctor?.name || '',
      patientId: d.patient?.id,
      patient: d.patient?.name || '',
      startsAt: d.startsAt?.toISOString?.() || null,
      endsAt: d.endsAt?.toISOString?.() || null,
      status: d.status,
      notes: d.notes || ''
    }));

    if (format === 'csv') {
      setCSV(res, 'appointments_detailed.csv');
      stringify(data, { header: true }).pipe(res);
      return;
    }
    return res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
