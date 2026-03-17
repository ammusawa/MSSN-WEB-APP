require('dotenv').config();
const { sequelize, Announcement, User } = require('../src/models');

(async () => {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { username: 'admin' } });
    const a = await Announcement.create({
      title: 'Welcome to Baze MSSN',
      body: 'This is a sample announcement to verify the announcements page.',
      isPublic: true,
      authorId: admin ? admin.id : null
    });
    console.log('Seeded announcement id:', a.id);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();


