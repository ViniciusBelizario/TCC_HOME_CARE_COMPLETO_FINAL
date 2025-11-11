// file: src/models/AvailabilitySlot.js
const { DataTypes, Model } = require('sequelize');

class AvailabilitySlot extends Model {
  static initModel(sequelize) {
    AvailabilitySlot.init({
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      doctorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      startsAt: { type: DataTypes.DATE, allowNull: false },
      endsAt: { type: DataTypes.DATE, allowNull: false },
      isBooked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    }, { sequelize, tableName: 'availability_slots', timestamps: false, indexes: [{ fields: ['doctorId', 'startsAt', 'endsAt'] }] });
  }
}
module.exports = AvailabilitySlot;
