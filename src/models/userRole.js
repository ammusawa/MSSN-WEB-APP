module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    roleId: { type: DataTypes.INTEGER, allowNull: false }
  }, { 
    tableName: 'user_roles',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'roleId']
      }
    ]
  });
  return UserRole;
};