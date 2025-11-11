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
      }
    }, {
      sequelize,
      tableName: 'users',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    });
  }
}
module.exports = User;
