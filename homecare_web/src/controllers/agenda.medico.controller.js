// src/controllers/agenda.medico.controller.js
import { apiGet, apiPatch, apiPost } from '../services/api.service.js';

/** Token da sessão / header / locals */
function getToken(req, res) {
  if (req.session?.token) return req.session.token;
  const auth = req.headers?.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return res.locals?.auth?.token || null;
}

/** Obtém o ID do médico logado.
 *  Ajuste se seu backend usa outra chave (ex.: res.locals.auth.doctor.id) */
function getLoggedDoctorId(req, res) {
  const a = res.locals?.auth || {};
  const userId = a?.user?.id ?? a?.userId ?? req.session?.user?.id ?? null;
  return userId ? Number(userId) : null;
}

/** Página exclusiva do médico (sem seletor de médicos) */
export async function page(req, res) {
  try {
    const doctorId = getLoggedDoctorId(req, res);
    return res.render('medico/agenda', {
      titulo: 'Minha Agenda',
      doctorId,
      auth: res.locals?.auth || null,
    });
  } catch (e) {
    console.error('MedicoAgenda.page error:', e);
    return res.status(500).render('errors/500', { titulo: 'Erro' });
  }
}

// GET /agenda-medico/data?from=&to=
export async function getData(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const doctorId = getLoggedDoctorId(req, res);
    if (!doctorId) return res.status(401).json({ error: 'doctor_not_identified' });

    const { from, to } = req.query || {};

    const availability = await apiGet('/availability', token, {
      doctorId, ...(from ? { from } : {}), ...(to ? { to } : {})
    });

    const appointments = await apiGet(`/appointments/doctor/${doctorId}`, token, { from, to });

    return res.json({ availability, appointments });
  } catch (e) {
    console.error('MedicoAgenda.getData error:', e);
    return res.status(500).json({ error: 'agenda_medico_proxy_error' });
  }
}

// POST /agenda-medico/appointments/:id/confirm
export async function confirmAppointment(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });

    const data = await apiPatch(`/appointments/${id}/status`, token, { status: 'CONFIRMED' });
    return res.json(data);
  } catch (e) {
    console.error('MedicoAgenda.confirmAppointment error:', e);
    return res.status(500).json({ error: 'confirm_error' });
  }
}

// POST /agenda-medico/availability
export async function createAvailability(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const doctorId = getLoggedDoctorId(req, res);
    if (!doctorId) return res.status(401).json({ error: 'doctor_not_identified' });

    const { startsAt, endsAt } = req.body || {};
    const payload = { doctorId, startsAt, endsAt };

    const data = await apiPost('/availability', token, payload);
    return res.json(data);
  } catch (e) {
    console.error('MedicoAgenda.createAvailability error:', e);
    return res.status(500).json({ error: 'availability_error' });
  }
}

// POST /agenda-medico/availability/day-openings
export async function createDayOpenings(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const doctorId = getLoggedDoctorId(req, res);
    if (!doctorId) return res.status(401).json({ error: 'doctor_not_identified' });

    const { date, startTime, endTime, durationMin } = req.body || {};
    const payload = { doctorId, date, startTime, endTime, durationMin: Number(durationMin) };

    const data = await apiPost('/availability/day-openings', token, payload);
    return res.json(data);
  } catch (e) {
    console.error('MedicoAgenda.createDayOpenings error:', e);
    return res.status(500).json({ error: 'day_openings_error' });
  }
}
