module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    type: { 
      type: DataTypes.ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ANNOUNCEMENT', 'RESOURCE_UPLOADED', 'DONATION_RECEIVED'), 
      allowNull: false 
    },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
    readAt: { type: DataTypes.DATE, allowNull: true },
    actionUrl: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    emailSent: { type: DataTypes.BOOLEAN, defaultValue: false },
    emailSentAt: { type: DataTypes.DATE, allowNull: true }
  }, { 
    tableName: 'notifications',
    indexes: [
      {
        fields: ['userId', 'read']
      },
      {
        fields: ['createdAt']
      }
    ]
  });
  return Notification;
};
