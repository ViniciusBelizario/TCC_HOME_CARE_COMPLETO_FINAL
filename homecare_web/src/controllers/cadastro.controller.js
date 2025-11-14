// src/controllers/cadastro.controller.js
import { apiPost, apiGet } from '../services/api.service.js';

function getToken(req, res) {
  const sessionToken = req.session?.token;
  const auth = req.headers?.authorization || '';
  const headerToken = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  const cookieToken = req.cookies?.auth_token;
  const localsToken = res.locals?.auth?.token;
  return sessionToken || headerToken || cookieToken || localsToken || null;
}

export async function getCadastroPage(req, res) {
  try {
    const isAdmin = !!res.locals?.auth?.isAdmin;
    if (!isAdmin) {
      return res.status(403).render('errors/403', { titulo: 'Acesso negado', title: 'Acesso negado' });
    }
    return res.render('cadastro/index', { titulo: 'Cadastro', title: 'Cadastro' });
  } catch (err) {
    console.error('Erro ao carregar página de cadastro:', err);
    return res.status(500).render('errors/500', { titulo: 'Erro', title: 'Erro' });
  }
}

export async function postCreateAttendant(req, res) {
  const token = getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Usuário não autenticado (sessão/token ausente).' });

  try {
    const { name, email, cpf, password } = req.body || {};
    if (!name || !email || !cpf || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }
    const data = await apiPost('/auth/register/attendant', token, {
      name,
      email,
      cpf: String(cpf).replace(/\D/g, ''),
      password,
    });
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const { status, message } = parseApiError(err);
    return res.status(status).json({ error: message });
  }
}

export async function postCreateDoctor(req, res) {
  const token = getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Usuário não autenticado (sessão/token ausente).' });

  try {
    const { name, email, cpf, password, specialty, crm, coren } = req.body || {};

    if (!name || !email || !cpf || !password || !specialty) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    const hasCrm = !!crm && String(crm).trim() !== '';
    const hasCoren = !!coren && String(coren).trim() !== '';

    if (!hasCrm && !hasCoren) {
      return res.status(400).json({ error: 'Informe CRM (para médicos) ou COREN (para enfermeiras).' });
    }

    const payload = {
      name,
      email,
      cpf: String(cpf).replace(/\D/g, ''),
      password,
      specialty,
      crm: hasCrm ? String(crm).toUpperCase() : null,
      coren: hasCoren ? String(coren).toUpperCase() : null,
    };

    const data = await apiPost('/auth/register/doctor', token, payload);
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    const { status, message } = parseApiError(err);
    return res.status(status).json({ error: message });
  }
}

// GET /cadastro/doctors  -> proxy para GET {{BASE_URL}}/doctors (+q|cpf)
export async function getDoctors(req, res) {
  const token = getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Usuário não autenticado (sessão/token ausente).' });

  try {
    const query = {};
    if (req.query?.q) query.q = String(req.query.q);
    if (req.query?.cpf) query.cpf = String(req.query.cpf).replace(/\D/g, '');

    const list = await apiGet('/doctors', token, query);
    const raw = Array.isArray(list) ? list : (list?.items || list?.data || []);

    const data = raw.map(d => {
      const specialty = d.doctorProfile?.specialty ?? d.specialty ?? '';
      const crm = d.doctorProfile?.crm ?? d.crm ?? null;
      const coren = d.doctorProfile?.coren ?? d.coren ?? null;
      const registration = crm || coren || '';

      return {
        id: d.id,
        name: d.name,
        email: d.email,
        cpf: d.cpf,
        createdAt: d.createdAt || d.created_at,
        specialty,
        // usamos o mesmo campo "crm" na view para exibir CRM ou COREN
        crm: registration,
        coren,
      };
    });

    return res.json({ ok: true, data });
  } catch (err) {
    const { status, message } = parseApiError(err);
    return res.status(status).json({ error: message });
  }
}

// GET /cadastro/attendants -> proxy para GET {{BASE_URL}}/attendants (+q|cpf)
export async function getAttendants(req, res) {
  const token = getToken(req, res);
  if (!token) return res.status(401).json({ error: 'Usuário não autenticado (sessão/token ausente).' });

  try {
    const query = {};
    if (req.query?.q) query.q = String(req.query.q);
    if (req.query?.cpf) query.cpf = String(req.query.cpf).replace(/\D/g, '');

    const list = await apiGet('/attendants', token, query);
    const items = Array.isArray(list) ? list : (list?.items || list?.data || []);
    const data = items.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      cpf: a.cpf,
      createdAt: a.createdAt || a.created_at,
    }));
    return res.json({ ok: true, data });
  } catch (err) {
    const { status, message } = parseApiError(err);
    return res.status(status).json({ error: message });
  }
}

// POST /cadastro/users/:id/reset-senha -> proxy para POST {{BASE_URL}}/users/:id/reset-password
export async function postResetUserPassword(req, res) {
  const token = getToken(req, res);
  if (!token) return res.status(401).json({ ok: false, message: 'Usuário não autenticado (sessão/token ausente).' });

  try {
    const { id } = req.params;
    const payload = await apiPost(`/users/${id}/reset-password`, token, {});

    return res.json({
      ok: true,
      message: payload?.message || 'Senha resetada.',
      targetUserId: payload?.targetUserId ?? Number(id),
      targetRole: payload?.targetRole ?? null,
      temporaryPasswordHint: payload?.temporaryPasswordHint || null,
    });
  } catch (err) {
    const { status, message } = parseApiError(err);
    return res.status(status).json({ ok: false, message });
  }
}

function parseApiError(err) {
  const fallback = { status: 400, message: 'Erro ao comunicar com o serviço.' };
  const msg = err?.message || '';
  const m = msg.match(/=>\s*(\d{3}):\s*(.*)$/s);
  let status = 400, text = '';
  if (m) { status = parseInt(m[1], 10); text = m[2] || ''; }
  if (!text) return { status: status || fallback.status, message: fallback.message };
  try {
    const parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
    if (parsed?.message) return { status, message: parsed.message };
    if (parsed?.error) return { status, message: parsed.error };
    if (Array.isArray(parsed?.errors) && parsed.errors.length) {
      const joined = parsed.errors.map(e => {
        if (typeof e === 'string') return e;
        if (e?.field && e?.message) return `${e.field}: ${e.message}`;
        return e?.message || JSON.stringify(e);
      }).join(' ');
      return { status, message: joined };
    }
    return { status, message: text };
  } catch {
    return { status, message: text };
  }
}
