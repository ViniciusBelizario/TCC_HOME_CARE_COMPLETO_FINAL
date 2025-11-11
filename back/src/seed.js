const { sequelize, initModels, models: { User, DoctorProfile, PatientProfile, AvailabilitySlot, Appointment } } = require('./db');
const { hashPassword } = require('./utils/password');

(async () => {
  await initModels();
  await sequelize.sync({ alter: true });

  const adminPass = await hashPassword('admin123');
  const staffPass = await hashPassword('atendente123');
  const medPass = await hashPassword('medico123');
  const patientPass = await hashPassword('paciente123');

  // Admin
  const [admin] = await User.findOrCreate({
    where: { email: 'admin@tcc.com' },
    defaults: { name: 'Admin', email: 'admin@tcc.com', cpf: '00000000000', passwordHash: adminPass, role: 'ADMIN' }
  });

  // Atendente
  const [atendente] = await User.findOrCreate({
    where: { email: 'atendente@tcc.com' },
    defaults: { name: 'Ana Atendente', email: 'atendente@tcc.com', cpf: '33333333333', passwordHash: staffPass, role: 'ATENDENTE' }
  });

  // Médico
  const [medico] = await User.findOrCreate({
    where: { email: 'medico@tcc.com' },
    defaults: { name: 'Dra. Ana Souza', email: 'medico@tcc.com', cpf: '11111111111', passwordHash: medPass, role: 'MEDICO' }
  });
  await DoctorProfile.findOrCreate({ where: { userId: medico.id }, defaults: { specialty: 'Clínico Geral', crm: 'CRM-SP-123456' } });

  // Paciente
  const [paciente] = await User.findOrCreate({
    where: { email: 'paciente@tcc.com' },
    defaults: { name: 'João Paciente', email: 'paciente@tcc.com', cpf: '22222222222', passwordHash: patientPass, role: 'PACIENTE' }
  });
  await PatientProfile.findOrCreate({ where: { userId: paciente.id }, defaults: { phone: '11999999999', address: 'Rua Exemplo, 123 - SP' } });

  // Slots do médico (3)
  const now = new Date(); now.setMinutes(0,0,0);
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9);
  for (let i = 0; i < 3; i++) {
    const start = new Date(base.getTime() + i * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await AvailabilitySlot.findOrCreate({ where: { doctorId: medico.id, startsAt: start, endsAt: end }, defaults: { isBooked: false } });
  }

  // 1 consulta PENDING (paciente + médico)
  const firstSlot = await AvailabilitySlot.findOne({ where: { doctorId: medico.id, isBooked: false }, order: [['startsAt', 'ASC']] });
  if (firstSlot) {
    await firstSlot.update({ isBooked: true });
    await Appointment.findOrCreate({
      where: { doctorId: medico.id, patientId: paciente.id, startsAt: firstSlot.startsAt },
      defaults: { endsAt: firstSlot.endsAt, status: 'PENDING', notes: 'Consulta inicial aguardando confirmação da atendente' }
    });
  }

  console.log('Seed concluído.');
  await sequelize.close();
})();
