module.exports = (sequelize, DataTypes) => {
  const Analytics = sequelize.define('Analytics', {
    eventType: { type: DataTypes.ENUM('LOGIN', 'DOWNLOAD', 'VIEW', 'REGISTER', 'EMAIL_VERIFIED'), allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    resourceId: { type: DataTypes.INTEGER, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true }
  }, { 
    tableName: 'analytics',
    indexes: [
      {
        fields: ['eventType', 'createdAt']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['resourceId']
      }
    ]
  });
  return Analytics;
};
