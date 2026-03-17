module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ManagementMember', {
    name: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    bio: { type: DataTypes.TEXT },
    photo: { type: DataTypes.STRING }, // Path to photo file
    category: { type: DataTypes.ENUM('AMEER', 'EXECUTIVE', 'LEADER', 'EXCO', 'OTHER'), defaultValue: 'EXECUTIVE' },
    order: { type: DataTypes.INTEGER, defaultValue: 0 }, // For sorting/ordering
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    userId: { type: DataTypes.INTEGER, allowNull: true } // Optional link to User account
  }, { tableName: 'management_members' });
};

