module.exports = (sequelize, DataTypes) => {
  const Reimbursement = sequelize.define('Reimbursement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: false
    },
    person: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reimburse_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    item: {
      type: DataTypes.STRING,
      allowNull: false
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    screenshot_info: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    screenshot_path: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'reimbursement',
    timestamps: false
  });

  return Reimbursement;
};
