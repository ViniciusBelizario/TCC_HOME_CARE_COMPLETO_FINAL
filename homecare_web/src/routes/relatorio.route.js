import { Router } from 'express';
import { view } from '../controllers/relatorio.controller.js';

const router = Router();

// URL final será /relatorio (porque vamos montar em app.use('/relatorio', ...))
router.get('/', view);

export default router;
