module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    script_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dm_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    session_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    session_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    attribute: {
      type: DataTypes.ENUM('box', 'city'),
      allowNull: false
    },
    props_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    praise_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_settled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'session',
    timestamps: false
  });

  Session.associate = (models) => {
    Session.belongsTo(models.Dm, { foreignKey: 'dm_id' });
    Session.belongsTo(models.Script, { foreignKey: 'script_id' });
    Session.hasMany(models.SalarySettlementDetail, { foreignKey: 'session_id' });
  };

  return Session;
};
