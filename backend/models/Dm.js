module.exports = (sequelize, DataTypes) => {
  const Dm = sequelize.define('Dm', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('parttime', 'step', 'fulltime'),
      allowNull: false,
      defaultValue: 'parttime'
    }
  }, {
    tableName: 'dm',
    timestamps: false
  });

  Dm.associate = (models) => {
    Dm.hasMany(models.Session, { foreignKey: 'dm_id' });
    Dm.hasMany(models.SalarySettlement, { foreignKey: 'dm_id' });
  };

  return Dm;
};
