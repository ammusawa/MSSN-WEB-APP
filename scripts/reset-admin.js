require('dotenv').config();
const { User } = require('../src/models');

(async () => {
  try {
    // Find admin user
    let admin = await User.findOne({ where: { username: 'admin' } });
    
    if (!admin) {
      console.log('Admin user not found. Creating new admin...');
      admin = User.build({ 
        username: 'admin', 
        email: 'admin@example.com', 
        role: 'ADMIN', 
        isSuperuser: true 
      });
      await admin.setPassword('admin1234');
      await admin.save();
      console.log('✅ Admin user created successfully!');
    } else {
      console.log('Admin user found. Resetting password...');
      await admin.setPassword('admin1234');
      await admin.save();
      console.log('✅ Admin password reset successfully!');
    }
    
    console.log('\n📋 Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin1234');
    console.log('   Role: ADMIN');
    console.log('   Superuser: true\n');
    
    // Verify the password works
    const testPassword = await admin.validatePassword('admin1234');
    if (testPassword) {
      console.log('✅ Password verification test passed!');
    } else {
      console.log('❌ Password verification test failed!');
    }
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();

