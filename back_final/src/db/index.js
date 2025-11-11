// src/db/index.js
const { Sequelize } = require('sequelize');
const { loadEnv } = require('../config/env');

const env = loadEnv();

let sequelize;
if (env.DB_DIALECT === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: env.SQLITE_STORAGE,
    logging: false
  });
} else {
  sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'mysql',
    logging: false
  });
}

// modelos
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const Appointment = require('../models/Appointment');
const ExamResult = require('../models/ExamResult');
const AuditLog = require('../models/AuditLog');
const UserObservation = require('../models/UserObservation');

async function initModels() {
  // Inicializa os models
  User.initModel(sequelize);
  PatientProfile.initModel(sequelize);
  DoctorProfile.initModel(sequelize);
  AvailabilitySlot.initModel(sequelize);
  Appointment.initModel(sequelize);
  ExamResult.initModel(sequelize);
  AuditLog.initModel(sequelize);
  UserObservation.initModel(sequelize);

  // === ASSOCIAÇÕES ===
  User.hasOne(PatientProfile, {
    foreignKey: 'userId',
    as: 'patientProfile',
    onDelete: 'CASCADE'
  });
  PatientProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasOne(DoctorProfile, {
    foreignKey: 'userId',
    as: 'doctorProfile',
    onDelete: 'CASCADE'
  });
  DoctorProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(AvailabilitySlot, { foreignKey: 'doctorId', as: 'availabilities' });
  AvailabilitySlot.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

  User.hasMany(Appointment, { foreignKey: 'doctorId', as: 'appointmentsAsDoctor' });
  User.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointmentsAsPatient' });
  Appointment.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
  Appointment.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });

  User.hasMany(ExamResult, { foreignKey: 'uploadedByUserId', as: 'uploadedExams' });
  User.hasMany(ExamResult, { foreignKey: 'patientId', as: 'patientExams' });
  ExamResult.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });
  ExamResult.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });

  // === Observações de usuários ===
  User.hasMany(UserObservation, {
    foreignKey: 'patientId',
    as: 'observationsReceived',
    onDelete: 'CASCADE'
  });
  User.hasMany(UserObservation, {
    foreignKey: 'doctorId',
    as: 'observationsAuthored',
    onDelete: 'CASCADE'
  });
  UserObservation.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
  UserObservation.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

  // === CRIAÇÃO AUTOMÁTICA DAS TABELAS ===
  // alter: true -> ajusta as colunas automaticamente (ideal para dev)
  await sequelize.sync({ alter: true });
  console.log('✅ Todas as tabelas sincronizadas com o banco de dados');
}

module.exports = {
  sequelize,
  initModels,
  models: {
    User,
    PatientProfile,
    DoctorProfile,
    AvailabilitySlot,
    Appointment,
    ExamResult,
    AuditLog,
    UserObservation
  }
};
