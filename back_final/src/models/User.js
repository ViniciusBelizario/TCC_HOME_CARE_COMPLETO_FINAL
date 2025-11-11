// src/models/User.js
const { DataTypes, Model } = require('sequelize');

class User extends Model {
  static initModel(sequelize) {
    User.init({
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
      cpf: { type: DataTypes.STRING(14), allowNull: true, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM('PACIENTE', 'MEDICO', 'ATENDENTE', 'ADMIN'),
        allowNull: false,
        defaultValue: 'PACIENTE'
      },
      // NOVO: obriga trocar a senha no próximo login
      mustChangePassword: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    }, {
      sequelize,
      tableName: 'users',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    });
  }

  static associate(models) {
    // Observações recebidas como paciente
    User.hasMany(models.UserObservation, {
      foreignKey: 'patientId',
      as: 'observationsReceived'
    });

    // Observações escritas como médico
    User.hasMany(models.UserObservation, {
      foreignKey: 'doctorId',
      as: 'observationsAuthored'
    });
  }
}

module.exports = User;
