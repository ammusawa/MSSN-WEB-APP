module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Meeting', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    meetingType: { type: DataTypes.ENUM('VIDEO', 'VOICE'), defaultValue: 'VIDEO' },
    meetingId: { type: DataTypes.STRING, unique: true, allowNull: false },
    organizerId: { type: DataTypes.INTEGER, allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
    allowedRoles: { type: DataTypes.JSON, allowNull: true }, // Array of roles: ['EXECUTIVE', 'MEMBER'] or null for all
    maxParticipants: { type: DataTypes.INTEGER, defaultValue: 50 },
    password: { type: DataTypes.STRING, allowNull: true }
  }, { tableName: 'meetings' });
};

