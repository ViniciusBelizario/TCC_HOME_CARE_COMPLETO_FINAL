// src/routes/home.route.js
import { Router } from 'express';
import * as Home from '../controllers/home.controller.js';
import { ensureAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Home (protegida)
router.get('/', ensureAuth, Home.home);

// Troca de senha obrigatória
router.get('/change-password', Home.getChangePassword);
router.post('/change-password', Home.postChangePassword);

export default router;
