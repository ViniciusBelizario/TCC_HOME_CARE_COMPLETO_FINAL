const { DataTypes, Model } = require('sequelize');

class Appointment extends Model {
  static initModel(sequelize) {
    Appointment.init({
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      patientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      doctorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      startsAt: { type: DataTypes.DATE, allowNull: false },
      endsAt: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'),
        defaultValue: 'PENDING'
      },
      notes: { type: DataTypes.TEXT, allowNull: true }
    }, {
      sequelize,
      tableName: 'appointments',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      indexes: [{ fields: ['doctorId', 'startsAt'] }, { fields: ['patientId', 'startsAt'] }]
    });
  }
}
module.exports = Appointment;
