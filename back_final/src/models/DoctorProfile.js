// file: src/models/DoctorProfile.js
const { DataTypes, Model } = require('sequelize');

class DoctorProfile extends Model {
  static initModel(sequelize) {
    DoctorProfile.init({
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true
      },

      // Especialidade continua obrigatória
      specialty: {
        type: DataTypes.STRING,
        allowNull: false
      },

      // CRM agora é OPCIONAL
      crm: {
        type: DataTypes.STRING,
        allowNull: true,       // <- antes era false
        unique: true
      },

      // Novo campo: COREN, também OPCIONAL
      coren: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      }
    }, {
      sequelize,
      tableName: 'doctor_profiles',
      timestamps: false
    });
  }
}

module.exports = DoctorProfile;
