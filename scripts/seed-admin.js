require('dotenv').config();
const { User } = require('../src/models');
(async()=>{
  try{
    let u = await User.findOne({ where: { username: 'admin' } });
    if (!u) {
      u = await User.build({ username: 'admin', email: 'admin@example.com', role: 'ADMIN', isSuperuser: true });
      await u.setPassword('admin1234');
      await u.save();
      console.log('Admin created: admin / admin1234');
    } else {
      console.log('Admin already exists.');
    }
    process.exit(0);
  } catch(e){ console.error(e); process.exit(1); }
})();
