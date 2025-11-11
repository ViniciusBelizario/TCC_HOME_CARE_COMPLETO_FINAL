import fetch from 'node-fetch';
import { apiGet, apiPatch, apiPost } from '../services/api.service.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3333/api';

/* ---------------- helpers ---------------- */
function getToken(req, res) {
  // Authorization: Bearer ...
  const authHdr = (req.headers?.authorization || '').trim();
  const bearer =
    authHdr.toLowerCase().startsWith('bearer ') ? authHdr.slice(7).trim() : null;

  // session / locals com várias chaves possíveis (cobrimos variações)
  const sessionToken =
    req.session?.token ||
    req.session?.auth?.token ||
    req.session?.user?.token ||
    req.session?.user?.accessToken ||
    null;

  const cookieToken = req.cookies?.auth_token || null; // ok se undefined
  const localsToken =
    res.locals?.auth?.token ||
    res.locals?.token ||
    null;

  return bearer || sessionToken || cookieToken || localsToken || null;
}

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}
function endOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}
function isWithin(dateISO, start, end) {
  const d = new Date(dateISO);
  const t = d.getTime();
  return !Number.isNaN(t) && t >= start.getTime() && t <= end.getTime();
}

/* ---------------- página ---------------- */
export async function getPacientesHojePage(req, res) {
  res.render('medico/pacientes-hoje', {
    titulo: 'Pacientes de Hoje',
    auth: res.locals?.auth || {}
  });
}

/* ---------------- dados do dia ---------------- */
export async function getPacientesHojeData(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const all = await apiGet('/appointments/my', token);
    const items = Array.isArray(all) ? all : [];

    const start = startOfTodayLocal();
    const end = endOfTodayLocal();

    // Hoje (horário local)
    const today = items.filter(a => isWithin(a?.startsAt, start, end));

    // Abertas: somente CONFIRMED (PENDING não deve aparecer para o médico)
    const open = today.filter(a => a.status === 'CONFIRMED');
    const completed = today.filter(a => a.status === 'COMPLETED');

    return res.json({ open, completed });
  } catch (e) {
    console.error('getPacientesHojeData error:', e);
    return res.status(500).json({ error: 'load_error' });
  }
}

/* ---------------- finalizar consulta ---------------- */
export async function finalizarConsulta(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { id } = req.params;
    const out = await apiPatch(`/appointments/${id}/status`, token, { status: 'COMPLETED' });
    return res.json(out);
  } catch (e) {
    console.error('finalizarConsulta:', e);
    return res.status(400).json({ error: 'finish_error' });
  }
}

/* ---------------- observações ---------------- */
export async function criarObservacao(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { patientId } = req.params;
    const { note } = req.body || {};
    if (!note) return res.status(400).json({ error: 'note é obrigatório' });

    const data = await apiPost(`/patients/${patientId}/observations`, token, { note });
    return res.status(201).json(data);
  } catch (e) {
    console.error('criarObservacao:', e);
    return res.status(400).json({ error: 'create_obs_error' });
  }
}

export async function listarObservacoes(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { patientId } = req.params;
    const page = req.query.page ?? 1;
    const pageSize = req.query.pageSize ?? 20;

    const data = await apiGet(`/patients/${patientId}/observations`, token, { page, pageSize });
    return res.json(data);
  } catch (e) {
    console.error('listarObservacoes:', e);
    return res.status(400).json({ error: 'list_obs_error' });
  }
}

/* ---------------- exames (proxy com token) ---------------- */
async function pipeBinary(apiUrl, token, res, forceDownload = false) {
  const r = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });

  res.status(r.status);
  const ct = r.headers.get('content-type') || 'application/octet-stream';
  res.setHeader('Content-Type', ct);

  const disp = r.headers.get('content-disposition');
  if (forceDownload) {
    // Força attachment mantendo nome quando possível
    let filename = 'arquivo';
    const m = disp && disp.match(/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i);
    if (m) filename = decodeURIComponent(m[2]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  } else if (disp) {
    res.setHeader('Content-Disposition', disp);
  }

  const cl = r.headers.get('content-length');
  if (cl) res.setHeader('Content-Length', cl);

  if (!r.body) return res.end();
  r.body.pipe(res);
}

export async function proxyExamView(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).send('unauthorized');
    const { id } = req.params;
    await pipeBinary(`${API_BASE}/exams/${id}/view`, token, res, false);
  } catch (e) {
    console.error('proxyExamView:', e);
    res.status(502).send('Falha ao carregar exame.');
  }
}

export async function proxyExamDownload(req, res) {
  try {
    const token = getToken(req, res);
    if (!token) return res.status(401).send('unauthorized');
    const { id } = req.params;
    await pipeBinary(`${API_BASE}/exams/${id}/download`, token, res, true);
  } catch (e) {
    console.error('proxyExamDownload:', e);
    res.status(502).send('Falha ao baixar exame.');
  }
}
