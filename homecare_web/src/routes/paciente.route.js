// src/routes/paciente.route.js
import { Router } from 'express';
import { ensureAuth, allowRoles } from '../middlewares/auth.middleware.js';
import {
  listarPacientes,
  listarPacientesJson,
  pacienteDetalhe,
  criarPaciente,
  resetSenhaPaciente,
  buscarPacientes,
} from '../controllers/paciente.controller.js';

const router = Router();

// Todas exigem login
router.use(ensureAuth);

// 1) Listagem por papel
router.get('/', allowRoles('admin', 'atendente', 'medico', 'paciente'), listarPacientes);

// 2) Endpoints ESPECÍFICOS devem vir ANTES dos parâmetros dinâmicos
router.get('/_list.json', allowRoles('admin', 'atendente', 'medico'), listarPacientesJson);
router.get('/busca', allowRoles('admin', 'atendente', 'medico'), buscarPacientes);

// 3) Rotas dinâmicas por ID (depois)
router.get('/:id', allowRoles('admin', 'atendente', 'medico'), pacienteDetalhe);
router.post('/:id/reset-senha', allowRoles('admin', 'atendente'), resetSenhaPaciente);

// 4) Criação (não conflita com GETs)
router.post('/', allowRoles('admin', 'atendente'), criarPaciente);

export default router;
