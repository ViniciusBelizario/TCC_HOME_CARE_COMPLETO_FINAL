// src/controllers/home.controller.js
import { loginService, changePasswordService } from '../services/auth.service.js';

export const home = (req, res) => {
  // área protegida (ensureAuth já garante)
  res.render('home/index', { titulo: 'Home' });
};

export const login = (req, res) => {
  if (req.session?.user) return res.redirect('/');
  res.render('login', { titulo: 'Login', layout: 'layouts/auth' });
};

export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await loginService({ email, password });

    const allowed = ['ADMIN', 'ATENDENTE', 'MEDICO'];
    if (!allowed.includes(user.role)) {
      return res.status(403).render('login', {
        titulo: 'Login',
        layout: 'layouts/auth',
        erro: 'Perfil sem acesso.'
      });
    }

    req.session.token = token;
    req.session.user = user;

    // ⚠️ se a API sinalizar troca obrigatória de senha
    if (user.mustChangePassword === true) {
      return res.redirect('/change-password');
    }

    res.redirect('/');
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(401).render('login', {
      titulo: 'Login',
      layout: 'layouts/auth',
      erro: 'Credenciais inválidas.'
    });
  }
};

export const getChangePassword = (req, res) => {
  if (!req.session?.token) return res.redirect('/login');
  res.render('change-password', { titulo: 'Trocar senha', layout: 'layouts/auth', erro: null });
};

export const postChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword !== confirmPassword) {
      return res.render('change-password', {
        titulo: 'Trocar senha',
        layout: 'layouts/auth',
        erro: 'As senhas não coincidem.'
      });
    }

    const token = req.session.token;
    await changePasswordService({ currentPassword, newPassword, token });

    // limpa a sessão e força novo login
    req.session.destroy(() => {
      res.render('login', {
        titulo: 'Login',
        layout: 'layouts/auth',
        msg: 'Senha alterada com sucesso. Faça login novamente.'
      });
    });
  } catch (err) {
    console.error('Erro ao trocar senha:', err);
    res.render('change-password', {
      titulo: 'Trocar senha',
      layout: 'layouts/auth',
      erro: 'Erro ao trocar senha. Verifique a senha atual.'
    });
  }
};

export const logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};
