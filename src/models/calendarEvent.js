module.exports = (sequelize, DataTypes) => {
  return sequelize.define('CalendarEvent', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: true },
    location: { type: DataTypes.STRING },
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
    eventType: { 
      type: DataTypes.ENUM('LECTURE', 'MEETING', 'EVENT', 'HOLIDAY', 'OTHER'), 
      defaultValue: 'EVENT' 
    },
    organizerId: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'calendar_events' });
};

