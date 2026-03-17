module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Resource', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    fileType: { type: DataTypes.ENUM('PDF','AUDIO','VIDEO','OTHER'), defaultValue: 'PDF' },
    filePath: { type: DataTypes.STRING, allowNull: false },
    downloads: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, { tableName: 'resources' });
};
