module.exports = (sequelize, DataTypes) => {
  const SalarySettlementDetail = sequelize.define('SalarySettlementDetail', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    settlement_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'salary_settlement_detail',
    timestamps: false
  });

  SalarySettlementDetail.associate = (models) => {
    SalarySettlementDetail.belongsTo(models.SalarySettlement, { foreignKey: 'settlement_id' });
    SalarySettlementDetail.belongsTo(models.Session, { foreignKey: 'session_id' });
  };

  return SalarySettlementDetail;
};
