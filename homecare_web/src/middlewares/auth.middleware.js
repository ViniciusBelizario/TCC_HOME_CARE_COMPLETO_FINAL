// src/middlewares/auth.middleware.js

// Para páginas, basta estar logado (não obrigue ter token aqui)
export function ensureAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/login');
}

// Versão que exige token (use só onde realmente precisar)
export function ensureAuthWithToken(req, res, next) {
  if (req.session?.user && req.session?.token) return next();
  return res.redirect('/login');
}

// Normaliza papel e aceita sinônimos
export function allowRoles(...roles) {
  // normaliza os roles de entrada
  const normalized = roles.map(r => String(r).toLowerCase());

  return (req, res, next) => {
    const raw = req.session?.user?.role ?? req.session?.user?.type ?? null;
    const role = String(raw || '').toLowerCase();

    // aceita sinônimos comuns
    const synonyms = new Set([
      'admin', 'administrator',
      'atendente', 'reception', 'receptionist',
      'medico', 'médico', 'doctor',
    ]);

    if (!role) {
      return res.status(403).render('home', { titulo: 'Acesso negado' });
    }

    // se o papel não é reconhecido, bloqueia
    if (!synonyms.has(role)) {
      return res.status(403).render('home', { titulo: 'Acesso negado' });
    }

    // se o papel (normalizado) está entre os autorizados
    if (normalized.includes(role) ||
        // casos de sinônimos — ex: permitir 'administrator' quando pediu 'admin'
        (normalized.includes('admin') && (role === 'administrator')) ||
        (normalized.includes('atendente') && (role === 'reception' || role === 'receptionist')) ||
        (normalized.includes('medico') && (role === 'médico' || role === 'doctor'))
    ) {
      return next();
    }

    return res.status(403).render('home', { titulo: 'Acesso negado' });
  };
}
