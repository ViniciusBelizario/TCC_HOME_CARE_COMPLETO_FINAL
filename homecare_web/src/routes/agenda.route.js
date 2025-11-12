// src/routes/agenda.route.js
import { Router } from 'express';
import * as AgendaCtrl from '../controllers/agenda.controller.js';

const router = Router();

// Página da agenda
router.get('/', AgendaCtrl.calendario);

// Dados (availability + appointments)
router.get('/data', AgendaCtrl.getData);

// Confirmar consulta
router.post('/appointments/:id/confirm', AgendaCtrl.confirmAppointment);

// Disponibilizar horário específico
router.post('/availability', AgendaCtrl.createAvailability);

// Disponibilizar horários em lote (dia)
router.post('/availability/day-openings', AgendaCtrl.createDayOpenings);

// EXCLUIR horário disponível (vaga)
router.delete('/availability/:id', AgendaCtrl.deleteAvailability);

export default router;
