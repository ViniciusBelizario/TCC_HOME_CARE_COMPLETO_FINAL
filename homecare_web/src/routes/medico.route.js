// src/routes/medico.route.js
import { Router } from 'express';
import { ensureAuth, allowRoles } from '../middlewares/auth.middleware.js';
import {
  getPacientesHojePage,
  getPacientesHojeData,
  finalizarConsulta,
  criarObservacao,
  listarObservacoes,
  listarExamesPaciente,     // ⬅ novo
  proxyExamView,
  proxyExamDownload
} from '../controllers/medico.controller.js';

const router = Router();

// Todas as rotas de médico: exige login e papel MEDICO
router.use(ensureAuth, allowRoles('medico'));

// Página
router.get('/pacientes-hoje', getPacientesHojePage);

// Dados (abertas + finalizadas do dia)
router.get('/pacientes-hoje/data', getPacientesHojeData);

// Finalizar consulta (CONFIRMED -> COMPLETED)
router.patch('/consultas/:id/finalizar', finalizarConsulta);

// Observações do paciente
router.post('/pacientes/:patientId/observacoes', criarObservacao);
router.get('/pacientes/:patientId/observacoes', listarObservacoes);

// Exames do paciente
router.get('/exames/paciente/:patientId', listarExamesPaciente);

// Proxies de exames (inline e download) mantendo o token
router.get('/exames/:id/view', proxyExamView);
router.get('/exames/:id/download', proxyExamDownload);

export default router;
