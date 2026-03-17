require('dotenv').config();
const { User } = require('../src/models');

(async () => {
  try {
    const username = 'admin';
    const newPassword = 'admin1234';
    
    // Find admin user
    let user = await User.findOne({ where: { username } });
    
    if (!user) {
      console.log('Admin user not found. Creating new admin account...');
      user = User.build({ 
        username: 'admin', 
        email: 'admin@example.com', 
        role: 'ADMIN', 
        isSuperuser: true 
      });
    } else {
      console.log('Admin user found. Resetting password...');
    }
    
    // Set new password
    await user.setPassword(newPassword);
    await user.save();
    
    console.log(`\n✅ Admin account ready!`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Superuser: ${user.isSuperuser}`);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();

