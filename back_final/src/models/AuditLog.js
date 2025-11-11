const { DataTypes, Model } = require('sequelize');

class AuditLog extends Model {
  static initModel(sequelize) {
    AuditLog.init({
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      actorUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },   // pode ser null (ações públicas no futuro)
      actorRole: { type: DataTypes.ENUM('PACIENTE','MEDICO','ATENDENTE','ADMIN'), allowNull: true },
      action: { type: DataTypes.STRING(50), allowNull: false },              // ex.: 'LOGIN','USER_CREATE','APPOINTMENT_CREATE', ...
      entityType: { type: DataTypes.STRING(50), allowNull: true },           // ex.: 'USER','APPOINTMENT','EXAM','AVAILABILITY'
      entityId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      meta: { type: DataTypes.JSON, allowNull: true },                       // guardar somente metadados não sensíveis
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.TEXT, allowNull: true }
    }, {
      sequelize,
      tableName: 'audit_logs',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: false,
      indexes: [
        { fields: ['createdAt'] },
        { fields: ['actorUserId'] },
        { fields: ['action'] },
        { fields: ['entityType','entityId'] }
      ]
    });
  }
}
module.exports = AuditLog;
