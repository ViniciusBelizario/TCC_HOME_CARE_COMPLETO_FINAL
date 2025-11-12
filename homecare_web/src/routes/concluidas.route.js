// src/routes/concluidas.route.js
import { Router } from 'express';
import { allowRoles, ensureAuth } from '../middlewares/auth.middleware.js';
import * as Ctrl from '../controllers/concluidas.controller.js';

const router = Router();

// atendente e médico costumam precisar dessa tela; admin também pode
router.use(ensureAuth, allowRoles('ADMIN','ATENDENTE','MEDICO'));

router.get('/', Ctrl.page);
router.get('/data', Ctrl.listData);

export default router;
