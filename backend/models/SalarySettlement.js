module.exports = (sequelize, DataTypes) => {
  const SalarySettlement = sequelize.define('SalarySettlement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dm_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    total_cars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    ladder_cars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    base_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    bonus_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    city_extra: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    blood_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    props_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    milestone_reward: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'salary_settlement',
    timestamps: false
  });

  SalarySettlement.associate = (models) => {
    SalarySettlement.belongsTo(models.Dm, { foreignKey: 'dm_id' });
    SalarySettlement.hasMany(models.SalarySettlementDetail, { foreignKey: 'settlement_id' });
  };

  return SalarySettlement;
};
