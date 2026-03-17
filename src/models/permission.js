module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    code:  { type: DataTypes.STRING, unique: true, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: false },
  }, { tableName: 'permissions' });
  return Permission;
};