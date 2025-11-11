// file: src/models/PatientProfile.js
const { DataTypes, Model } = require('sequelize');

class PatientProfile extends Model {
  static initModel(sequelize) {
    PatientProfile.init({
      userId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      birthDate: { type: DataTypes.DATE, allowNull: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.STRING, allowNull: true }
    }, { sequelize, tableName: 'patient_profiles', timestamps: false });
  }
}
module.exports = PatientProfile;
