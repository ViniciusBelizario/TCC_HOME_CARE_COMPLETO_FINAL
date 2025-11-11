// src/models/UserObservation.js
const { DataTypes, Model } = require('sequelize');

class UserObservation extends Model {
  static initModel(sequelize) {
    UserObservation.init({
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

      // FK para o paciente (users.id)
      patientId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },

      // FK para o médico autor (users.id)
      doctorId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },

      // Texto da observação
      note: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      }
    }, {
      sequelize,
      tableName: 'user_observations',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      paranoid: true,            // soft delete
      deletedAt: 'deletedAt'
    });
  }

  static associate(models) {
    UserObservation.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'patient'
    });

    UserObservation.belongsTo(models.User, {
      foreignKey: 'doctorId',
      as: 'doctor'
    });
  }
}

module.exports = UserObservation;
