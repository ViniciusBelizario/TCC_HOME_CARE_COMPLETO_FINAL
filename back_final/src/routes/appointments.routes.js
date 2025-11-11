// src/routes/appointments.routes.js
const { Router } = require('express');
const {
  models: { AvailabilitySlot, Appointment, User, PatientProfile, UserObservation }
} = require('../db');
const { auth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { logAction } = require('../utils/audit');
const { Op } = require('sequelize');

const router = Router();

/**
 * Fallback: tenta extrair endereço de notes.
 * Aceita formatos tipo:
 *  - "Endereço: Rua Exemplo, 456 — Bairro Central — Belo Horizonte, MG — 30123-456"
 */
function parseAddressFromNotes(notes) {
  if (!notes) return null;
  const m = notes.match(/Endereç?o\s*:\s*([^\n\r]+)/i);
  return m ? m[1].trim() : null;
}

/**
 * Lê address do PatientProfile (uma consulta)
 */
async function getProfileAddress(userId) {
  const prof = await PatientProfile.findOne({
    where: { userId },
    attributes: ['address']
  });
  return prof?.address || null;
}

/**
 * Lê address do PatientProfile para vários pacientes (batch)
 */
async function getProfileAddressMap(userIds) {
  const map = new Map();
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return map;

  const rows = await PatientProfile.findAll({
    where: { userId: { [Op.in]: ids } },
    attributes: ['userId', 'address']
  });

  for (const r of rows) {
    map.set(r.userId, r.address || null);
  }
  return map;
}

/**
 * Lê a ÚLTIMA observação (mais recente) para cada paciente (batch)
 * Retorna Map<patientId, { note, createdAt, doctor: { id, name } }>
 */
async function getLatestObservationMap(patientIds) {
  const map = new Map();
  const ids = [...new Set(patientIds)].filter(Boolean);
  if (ids.length === 0) return map;

  const rows = await UserObservation.findAll({
    where: { patientId: { [Op.in]: ids } },
    include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']]
  });

  for (const r of rows) {
    if (!map.has(r.patientId)) {
      map.set(r.patientId, {
        note: r.note,
        createdAt: r.createdAt,
        doctor: r.doctor ? { id: r.doctor.id, name: r.doctor.name } : null
      });
    }
  }
  return map;
}

/**
 * Monta payload com patientAddressFull (string) e mantém patientAddress (obj) como null
 */
function attachAddressString(json, addressStr) {
  return {
    ...json,
    patientAddress: null,              // compat atual
    patientAddressFull: addressStr || null
  };
}

/**
 * Anexa a última observação do paciente ao payload
 */
function attachPatientObservation(json, obs) {
  return {
    ...json,
    patientObservation: obs
      ? {
          note: obs.note,
          createdAt: obs.createdAt,
          doctor: obs.doctor || null
        }
      : null
  };
}

/**
 * Includes mínimos
 */
const baseIncludes = [
  { model: User, as: 'doctor', attributes: ['id', 'name'] },
  { model: User, as: 'patient', attributes: ['id', 'name'] }
];

// ========================= AGENDAR =========================
router.post('/', auth(), requireRole('PACIENTE', 'ATENDENTE'), async (req, res, next) => {
  const t = await Appointment.sequelize.transaction();
  try {
    const { slotId, notes, patientId } = req.body;

    const slot = await AvailabilitySlot.findByPk(Number(slotId), {
      transaction: t, lock: t.LOCK.UPDATE
    });
    if (!slot || slot.isBooked) {
      await t.rollback();
      return res.status(400).json({ error: 'Slot inválido' });
    }

    let targetPatientId;
    if (req.user.role === 'PACIENTE') {
      targetPatientId = req.user.id;
      if (patientId && Number(patientId) !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ error: 'Paciente só agenda para si' });
      }
    } else {
      if (!patientId) {
        await t.rollback();
        return res.status(400).json({ error: 'patientId é obrigatório para atendente' });
      }
      const pat = await User.findByPk(Number(patientId));
      if (!pat || pat.role !== 'PACIENTE') {
        await t.rollback();
        return res.status(400).json({ error: 'patientId inválido' });
      }
      targetPatientId = pat.id;
    }

    // marca slot
    slot.isBooked = true;
    await slot.save({ transaction: t });

    // cria consulta
    const appt = await Appointment.create({
      patientId: targetPatientId,
      doctorId: slot.doctorId,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      notes: notes || null,
      status: 'PENDING'
    }, { transaction: t });

    await t.commit();

    await logAction(req, {
      action: 'APPOINTMENT_CREATE',
      entityType: 'APPOINTMENT',
      entityId: appt.id,
      meta: { slotId: slot.id, doctorId: slot.doctorId, patientId: targetPatientId }
    });

    // recarrega para incluir doctor/patient
    const apptFull = await Appointment.findByPk(appt.id, { include: baseIncludes });
    const json = typeof apptFull.toJSON === 'function' ? apptFull.toJSON() : apptFull;

    // endereço: 1) PatientProfile.address; 2) "Endereço:" em notes
    let addrStr = await getProfileAddress(json.patientId);
    if (!addrStr) addrStr = parseAddressFromNotes(json.notes);

    // última observação do paciente
    const obsMap = await getLatestObservationMap([json.patientId]);
    const obs = obsMap.get(json.patientId) || null;

    const payload = attachPatientObservation(attachAddressString(json, addrStr), obs);
    return res.status(201).json(payload);
  } catch (e) {
    await t.rollback();
    next(e);
  }
});

// ===================== MINHAS CONSULTAS ====================
router.get('/my', auth(), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const where = { ...(status ? { status } : {}) };
    if (req.user.role === 'PACIENTE') where.patientId = req.user.id;
    if (req.user.role === 'MEDICO') where.doctorId = req.user.id;

    const items = await Appointment.findAll({
      where,
      order: [['startsAt', 'ASC']],
      include: baseIncludes
    });

    await logAction(req, {
      action: 'APPOINTMENT_LIST_MY',
      entityType: null,
      entityId: null,
      meta: { role: req.user.role, status: status || null }
    });

    const json = items.map(i => (typeof i.toJSON === 'function' ? i.toJSON() : i));
    const patientIds = json.map(x => x.patientId);

    // Address e Observações (batch)
    const [addressMap, obsMap] = await Promise.all([
      getProfileAddressMap(patientIds),
      getLatestObservationMap(patientIds)
    ]);

    const data = json.map(x => {
      let addrStr = addressMap.get(x.patientId) || null;
      if (!addrStr) addrStr = parseAddressFromNotes(x.notes);
      const withAddr = attachAddressString(x, addrStr);

      const obs = obsMap.get(x.patientId) || null;
      return attachPatientObservation(withAddr, obs);
    });

    res.json(data);
  } catch (e) { next(e); }
});

// ================= CONSULTAS POR MÉDICO ====================
router.get('/doctor/:doctorId', auth(), requireRole('ATENDENTE', 'MEDICO'), async (req, res, next) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (req.user.role === 'MEDICO' && req.user.id !== doctorId) {
      return res.status(403).json({ error: 'Médico só acessa a própria agenda' });
    }
    const status = req.query.status ? String(req.query.status) : undefined;
    const where = { doctorId, ...(status ? { status } : {}) };

    const items = await Appointment.findAll({
      where,
      order: [['startsAt', 'ASC']],
      include: baseIncludes
    });

    await logAction(req, {
      action: 'APPOINTMENT_LIST_DOCTOR',
      entityType: 'USER',
      entityId: doctorId,
      meta: { status: status || null }
    });

    const json = items.map(i => (typeof i.toJSON === 'function' ? i.toJSON() : i));
    const patientIds = json.map(x => x.patientId);

    // Address e Observações (batch)
    const [addressMap, obsMap] = await Promise.all([
      getProfileAddressMap(patientIds),
      getLatestObservationMap(patientIds)
    ]);

    const data = json.map(x => {
      let addrStr = addressMap.get(x.patientId) || null;
      if (!addrStr) addrStr = parseAddressFromNotes(x.notes);
      const withAddr = attachAddressString(x, addrStr);

      const obs = obsMap.get(x.patientId) || null;
      return attachPatientObservation(withAddr, obs);
    });

    res.json(data);
  } catch (e) { next(e); }
});

// =============== ALTERAR STATUS (confirmar/etc.) ===========
router.patch('/:id/status', auth(), requireRole('PACIENTE', 'ATENDENTE', 'MEDICO'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const appt = await Appointment.findByPk(id);
    if (!appt) return res.status(404).json({ error: 'Consulta não encontrada' });

    const prev = appt.status;

    if (req.user.role === 'ATENDENTE') {
      const allowed = ['CONFIRMED', 'CANCELLED'];
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Transição não permitida para atendente' });
      if (appt.status !== 'PENDING') return res.status(400).json({ error: 'Só consultas PENDING podem ser confirmadas/canceladas pelo atendente' });
    } else if (req.user.role === 'MEDICO') {
      // Médico só manipula as próprias consultas
      if (appt.doctorId !== req.user.id) {
        return res.status(403).json({ error: 'Médico só altera suas consultas' });
      }

      // Agora o médico também pode CONFIRMAR quando estiver PENDING
      if (status === 'CONFIRMED') {
        if (appt.status !== 'PENDING') {
          return res.status(400).json({ error: 'Médico só confirma consultas em PENDING' });
        }
      } else if (status === 'COMPLETED' || status === 'CANCELLED') {
        // Finalizar ou cancelar continua exigindo que esteja CONFIRMED
        if (appt.status !== 'CONFIRMED') {
          return res.status(400).json({ error: 'Para finalizar/cancelar, a consulta deve estar CONFIRMED' });
        }
      } else {
        return res.status(400).json({ error: 'Transição não permitida para médico' });
      }
    } else if (req.user.role === 'PACIENTE') {
      if (status !== 'CANCELLED') return res.status(400).json({ error: 'Paciente só pode cancelar' });
      if (appt.patientId !== req.user.id) return res.status(403).json({ error: 'Paciente só altera suas consultas' });
      if (appt.status !== 'PENDING') return res.status(400).json({ error: 'Paciente só pode cancelar antes da confirmação' });
    }

    appt.status = status;
    await appt.save();

    await logAction(req, {
      action: 'APPOINTMENT_STATUS_UPDATE',
      entityType: 'APPOINTMENT',
      entityId: appt.id,
      meta: { from: prev, to: status }
    });

    // recarrega + endereço + última observação
    const apptFull = await Appointment.findByPk(appt.id, { include: baseIncludes });
    const json = typeof apptFull.toJSON === 'function' ? apptFull.toJSON() : apptFull;

    let addrStr = await getProfileAddress(json.patientId);
    if (!addrStr) addrStr = parseAddressFromNotes(json.notes);

    const obsMap = await getLatestObservationMap([json.patientId]);
    const obs = obsMap.get(json.patientId) || null;

    const payload = attachPatientObservation(attachAddressString(json, addrStr), obs);
    res.json(payload);
  } catch (e) { next(e); }
});

module.exports = router;
