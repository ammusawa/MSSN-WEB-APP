module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Announcement', {
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'announcements' });
};
