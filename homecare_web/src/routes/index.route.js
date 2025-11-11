// src/routes/index.route.js
import { Router } from 'express';
import * as Home from '../controllers/home.controller.js';

const router = Router();

// Login/logout
router.get('/login', Home.login);
router.post('/login', Home.postLogin);
router.post('/logout', Home.logout);

export default router;
