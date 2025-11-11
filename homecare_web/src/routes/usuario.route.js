import { Router } from 'express';
import * as Usuario from '../controllers/usuario.controller.js';
const router = Router();

router.get('/', Usuario.listar);
router.get('/cadastrar', Usuario.formCadastrar);
router.post('/cadastrar', Usuario.cadastrar);
router.get('/:id/editar', Usuario.formEditar);
router.post('/:id/editar', Usuario.editar);
router.post('/:id/remover', Usuario.remover);

export default router;
