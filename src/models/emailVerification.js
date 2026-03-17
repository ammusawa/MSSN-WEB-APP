module.exports = (sequelize, DataTypes) => {
  const EmailVerification = sequelize.define('EmailVerification', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('VERIFICATION', 'PASSWORD_RESET'), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    used: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, { 
    tableName: 'email_verifications',
    indexes: [
      {
        unique: true,
        fields: ['token']
      }
    ]
  });
  return EmailVerification;
};
