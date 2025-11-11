// src/controllers/agenda.controller.js
import { apiGet, apiPatch, apiPost } from '../services/api.service.js';

export const calendario = async (req, res) => {
  try {
    const token = req.session?.token;
    // /doctors é paginado => vem { items, total, ... }
    // pede um pageSize maior pra evitar múltiplas chamadas
    const doctorsResp = await apiGet('/doctors', token, { page: 1, pageSize: 100 });

    const list = Array.isArray(doctorsResp)
      ? doctorsResp
      : (Array.isArray(doctorsResp?.items) ? doctorsResp.items : []);

    const medicos = list.map(d => ({
      id: d.id,
      nome: d.name,
      email: d.email,
      crm: d.doctorProfile?.crm ?? null,
      specialty: d.doctorProfile?.specialty ?? null,
    }));

    res.render('agenda/index', {
      titulo: 'Agenda',
      medicos
    });
  } catch (e) {
    console.error('Erro ao listar médicos:', e);
    res.render('agenda/index', { titulo: 'Agenda', medicos: [] });
  }
};

// GET /agenda/data?doctorId=&from=&to=
export const getData = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    let { doctorId, from, to } = req.query;
    const doctorIdNum = Number.parseInt(doctorId, 10);

    if (!Number.isInteger(doctorIdNum) || doctorIdNum <= 0) {
      return res.status(400).json({ error: 'doctorId obrigatório e deve ser inteiro' });
    }

    const availability = await apiGet('/availability', token, {
      doctorId: doctorIdNum, ...(from ? { from } : {}), ...(to ? { to } : {})
    });

    const appointments = await apiGet(`/appointments/doctor/${doctorIdNum}`, token, { from, to });

    res.json({ availability, appointments });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'agenda_proxy_error' });
  }
};

// POST /agenda/appointments/:id/confirm
export const confirmAppointment = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });

    const data = await apiPatch(`/appointments/${id}/status`, token, { status: 'CONFIRMED' });
    res.json(data);
  } catch (e) {
    console.error('confirmAppointment error:', e);
    res.status(500).json({ error: 'confirm_error' });
  }
};

// POST /agenda/availability  -> disponibilizar específica
export const createAvailability = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { doctorId, startsAt, endsAt } = req.body || {};
    const doctorIdNum = Number.parseInt(doctorId, 10);

    if (!Number.isInteger(doctorIdNum) || doctorIdNum <= 0) {
      return res.status(400).json({ error: 'doctorId obrigatório e deve ser inteiro' });
    }

    const payload = { doctorId: doctorIdNum, startsAt, endsAt };
    const data = await apiPost('/availability', token, payload);
    res.json(data);
  } catch (e) {
    console.error('createAvailability error:', e);
    res.status(500).json({ error: 'availability_error' });
  }
};

// POST /agenda/availability/day-openings -> disponibilizar em lote (dia)
export const createDayOpenings = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { doctorId, date, startTime, endTime, durationMin } = req.body || {};
    const doctorIdNum = Number.parseInt(doctorId, 10);

    if (!Number.isInteger(doctorIdNum) || doctorIdNum <= 0) {
      return res.status(400).json({ error: 'doctorId obrigatório e deve ser inteiro' });
    }

    const payload = {
      doctorId: doctorIdNum,
      date,
      startTime,
      endTime,
      durationMin: Number(durationMin)
    };

    const data = await apiPost('/availability/day-openings', token, payload);
    res.json(data);
  } catch (e) {
    console.error('createDayOpenings error:', e);
    res.status(500).json({ error: 'day_openings_error' });
  }
};
