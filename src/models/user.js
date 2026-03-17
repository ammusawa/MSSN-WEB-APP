const bcrypt = require('bcryptjs');
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    firstName: { type: DataTypes.STRING },
    lastName: { type: DataTypes.STRING },
    role: { type: DataTypes.ENUM('ADMIN','EXECUTIVE','MEMBER'), defaultValue: 'MEMBER' },
    isSuperuser: { type: DataTypes.BOOLEAN, defaultValue: false },
    emailVerified: { type: DataTypes.BOOLEAN, defaultValue: true }, // No email verification required
    emailVerificationToken: { type: DataTypes.STRING }
  }, { tableName: 'users' });

  User.prototype.setPassword = async function(pwd){ this.passwordHash = await bcrypt.hash(pwd, 10); };
  User.prototype.validatePassword = async function(pwd){ return bcrypt.compare(pwd, this.passwordHash); };
  return User;
};
