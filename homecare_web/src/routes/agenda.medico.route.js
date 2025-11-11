// src/routes/agenda.medico.route.js
import { Router } from 'express';
import * as MedAgenda from '../controllers/agenda.medico.controller.js';

const router = Router();

// Página da agenda exclusiva do médico
router.get('/', MedAgenda.page);

// Dados do mês/dia (apenas do médico logado)
router.get('/data', MedAgenda.getData);

// Confirmar consulta PENDING -> CONFIRMED
router.post('/appointments/:id/confirm', MedAgenda.confirmAppointment);

// Disponibilizar horário específico
router.post('/availability', MedAgenda.createAvailability);

// Disponibilizar horários em lote (um dia inteiro por intervalo)
router.post('/availability/day-openings', MedAgenda.createDayOpenings);

export default router;
