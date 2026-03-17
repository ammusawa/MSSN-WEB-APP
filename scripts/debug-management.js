require('dotenv').config();
const { sequelize, ManagementMember, User } = require('../src/models');

(async () => {
  try {
    console.log('Dialect:', sequelize.getDialect());
    const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('Tables:', tables.map(t => t.name));

    const rows = await ManagementMember.findAll({
      include: [{ model: User, as: 'User', attributes: ['id', 'username', 'email'] }],
      order: [['category', 'ASC'], ['order', 'ASC'], ['name', 'ASC']],
    });
    console.log('Management members:', rows.map(r => ({
      name: r.name,
      category: r.category,
      isActive: r.isActive,
      user: r.User ? r.User.username : null,
    })));
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
})();

