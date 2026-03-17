module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ResourceCategory', {
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true, allowNull: false }
  }, { tableName: 'resource_categories' });
};
