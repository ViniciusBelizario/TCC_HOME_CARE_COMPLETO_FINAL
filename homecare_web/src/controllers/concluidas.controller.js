// src/controllers/concluidas.controller.js
import { apiGet } from '../services/api.service.js';

// View
export const page = async (req, res) => {
  res.render('concluidas/index', {
    titulo: 'Consultas concluídas',
  });
};

// Dados com busca opcional por paciente (nome ou CPF via /patients?q=)
export const listData = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const { q } = req.query;

    // Busca base: todas concluídas
    const all = await apiGet('/appointments/completed', token);

    let items = Array.isArray(all) ? all : [];

    if (q && String(q).trim().length > 0) {
      // procura pacientes pelo termo
      const p = await apiGet('/patients', token, { q: String(q).trim(), page: 1, pageSize: 100 });
      const arr = Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [];
      const allowed = new Set(arr.map(x => Number(x.id)));
      items = items.filter(x => allowed.has(Number(x.patientId)));
    }

    // ordena por data desc
    items.sort((a,b) => new Date(b.startsAt) - new Date(a.startsAt));

    res.json({ items });
  } catch (e) {
    console.error('concluidas.listData', e);
    res.status(500).json({ error: 'completed_list_error' });
  }
};
