// src/app.js
import express from 'express';
import session from 'express-session';
import path from 'path';
import dotenv from 'dotenv';
import expressLayouts from 'express-ejs-layouts';

import indexRoute from './routes/index.route.js';
import usuarioRoute from './routes/usuario.route.js';
import agendaRoute from './routes/agenda.route.js';
import pacienteRoutes from './routes/paciente.route.js';
import cadastroRoutes from './routes/cadastro.routes.js';
import perfilRouter from './routes/perfil.route.js';
import relatorioRoute from './routes/relatorio.route.js';
import homeRoute from './routes/home.route.js';
import medicoRoute from './routes/medico.route.js';
import agendaMedicoRoute from './routes/agenda.medico.route.js';

import errorMiddleware from './middlewares/error.middleware.js';
import { setViewLocals } from './middlewares/view-locals.middleware.js';
import { ensureAuth, allowRoles } from './middlewares/auth.middleware.js';

dotenv.config();

const app = express();

// -------- Middlewares base --------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8h
}));

// Disponibiliza usuário em res.locals.user (legado)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Arquivos estáticos
app.use('/css', express.static(path.resolve('src/public/css')));
app.use('/js', express.static(path.resolve('src/public/js')));
app.use('/img', express.static(path.resolve('src/public/img')));

// (Opcional) se você também tem /public na raiz
app.use(express.static(path.resolve('public')));

// Expor helpers (inclui auth.token via view-locals)
app.use(setViewLocals);

// -------- View Engine (EJS + layouts) --------
app.set('view engine', 'ejs');
app.set('views', path.resolve('src/views'));
app.use(expressLayouts);
app.set('layout', 'layouts/layout');

// -------- Rotas --------
app.use('/', indexRoute);
app.use('/usuario', usuarioRoute);
app.use('/agenda', agendaRoute);
app.use('/pacientes', pacienteRoutes);
app.use('/relatorio', relatorioRoute);
app.use('/medico', medicoRoute);
app.use('/agenda-medico', agendaMedicoRoute);
app.use('/', homeRoute);  // / (Home) protegida por ensureAuth

// Protege /cadastro com sessão e papel admin
app.use('/cadastro', ensureAuth, allowRoles('admin'), cadastroRoutes);
app.use('/perfil', perfilRouter);

// -------- 404 --------
// Não tenta renderizar "errors/404" para evitar o erro de lookup.
// Se aceita HTML, renderiza "home" com título "Não encontrado".
// Caso contrário, responde JSON.
app.use((req, res) => {
  const acceptHtml = (req.headers.accept || '').includes('text/html');
  if (acceptHtml) {
    try {
      return res.status(404).render('home', { titulo: 'Não encontrado' });
    } catch {
      // fallback absoluto
      return res.status(404).send('404 - Página não encontrada');
    }
  }
  return res.status(404).json({ error: 'not_found', path: req.originalUrl });
});

// -------- Handler de erro --------
// Nunca chama views inexistentes; usa "home" como fallback quando HTML.
app.use((err, req, res, next) => {
  console.error(err);
  const acceptHtml = (req.headers.accept || '').includes('text/html');
  if (acceptHtml) {
    try {
      return res.status(500).render('home', { titulo: 'Erro' });
    } catch {
      return res.status(500).send('500 - Erro interno');
    }
  }
  return res.status(500).json({ error: 'internal_error', message: err?.message || 'erro' });
});

// -------- Server --------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Admin on http://localhost:${PORT}`));

export default app;
