// src/controllers/perfil.controller.js
import { apiGet } from '../services/api.service.js';

function mapUser(u) {
  if (!u || typeof u !== 'object') return null;
  const role = (u.role || '').toUpperCase();
  const isMedico = role === 'MEDICO';

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    cpf: u.cpf,
    role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    doctorProfile: isMedico && u.doctorProfile ? {
      crm: u.doctorProfile.crm ?? null,
      specialty: u.doctorProfile.specialty ?? null,
    } : null
  };
}

export const paginaPerfil = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.redirect('/login');

    const me = await apiGet('/auth/me', token);
    const user = mapUser(me);

    res.render('perfil/index', { titulo: 'Perfil', user });
  } catch (e) {
    console.error('perfil.paginaPerfil error:', e);
    res.render('perfil/index', { titulo: 'Perfil', user: null });
  }
};

export const getMe = async (req, res) => {
  try {
    const token = req.session?.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    const me = await apiGet('/auth/me', token);
    res.json(mapUser(me));
  } catch (e) {
    console.error('perfil.getMe error:', e);
    res.status(500).json({ error: 'me_error' });
  }
};
