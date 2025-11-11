// file: src/models/DoctorProfile.js
const { DataTypes, Model } = require('sequelize');

class DoctorProfile extends Model {
  static initModel(sequelize) {
    DoctorProfile.init({
      userId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      specialty: { type: DataTypes.STRING, allowNull: false },
      crm: { type: DataTypes.STRING, allowNull: false, unique: true }
    }, { sequelize, tableName: 'doctor_profiles', timestamps: false });
  }
}
module.exports = DoctorProfile;
