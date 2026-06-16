module.exports = (sequelize, DataTypes) => {
  const Script = sequelize.define('Script', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    attribute: {
      type: DataTypes.ENUM('box', 'city'),
      allowNull: false,
      defaultValue: 'box'
    },
    genre: {
      type: DataTypes.STRING,
      allowNull: true
    },
    player_num: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    }
  }, {
    tableName: 'script',
    timestamps: false
  });

  Script.associate = (models) => {
    Script.hasMany(models.Session, { foreignKey: 'script_id' });
  };

  return Script;
};
