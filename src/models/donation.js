module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Donation', {
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    reference: { type: DataTypes.STRING, unique: true, allowNull: false },
    status: { type: DataTypes.ENUM('PENDING','SUCCESS','FAILED'), defaultValue: 'PENDING' }
  }, { tableName: 'donations' });
};
