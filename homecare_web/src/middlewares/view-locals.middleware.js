// src/middlewares/view-locals.middleware.js
/**
 * Expõe nas views (EJS) o usuário autenticado e helpers de papel.
 * Pressupõe que o ensureAuth já preenche req.user/req.session.
 */
export function setViewLocals(req, _res, next) {
  const u = req.user || req.session?.user || null;

  // tenta descobrir o papel em diferentes formatos
  const rawRole =
    u?.role ??
    u?.type ??
    u?.perfil ??
    u?.profile?.role ??
    u?.claims?.role ??
    null;

  const role = String(rawRole || '').toLowerCase(); // 'admin' | 'atendente' | 'medico'

  const isAdmin = role === 'admin' || role === 'administrator';
  const isAtendente = role === 'atendente' || role === 'reception' || role === 'receptionist';
  const isMedico = role === 'medico' || role === 'médico' || role === 'doctor';

  _res.locals.auth = {
    user: u,
    role,
    isAdmin,
    isAtendente,
    isMedico,
    isStaff: isAtendente || isMedico,
    // >>> ADICIONE ISTO: expõe o token da sessão para os controllers e views
    token: req.session?.token || null,
  };

  next();
}
