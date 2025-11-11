// src/routes/perfil.route.js
import { Router } from 'express';
import * as PerfilCtrl from '../controllers/perfil.controller.js';

const router = Router();

// Página do Perfil (SSR)
router.get('/', PerfilCtrl.paginaPerfil);

// API para recarregar dados no front
router.get('/me', PerfilCtrl.getMe);

export default router;
