// file: src/models/ExamResult.js
const { DataTypes, Model } = require('sequelize');

class ExamResult extends Model {
  static initModel(sequelize) {
    ExamResult.init({
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      patientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      uploadedByUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      filePath: { type: DataTypes.STRING, allowNull: false },
      filename: { type: DataTypes.STRING, allowNull: false },
      mimeType: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.STRING, allowNull: true }
    }, {
      sequelize,
      tableName: 'exam_results',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: false,
      indexes: [{ fields: ['patientId', 'createdAt'] }]
    });
  }
}
module.exports = ExamResult;
