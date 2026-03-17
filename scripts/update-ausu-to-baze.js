require('dotenv').config();
const { sequelize, Announcement } = require('../src/models');
const { Op } = require('sequelize');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Update announcements that contain AUSU
    const result = await Announcement.update(
      {
        title: sequelize.literal("REPLACE(title, 'AUSU', 'Baze')"),
        body: sequelize.literal("REPLACE(body, 'AUSU', 'Baze')")
      },
      {
        where: {
          [Op.or]: [
            { title: { [Op.like]: '%AUSU%' } },
            { body: { [Op.like]: '%AUSU%' } }
          ]
        }
      }
    );

    console.log(`Updated ${result[0]} announcement(s) containing AUSU.`);
    
    // Also check for lowercase 'ausu'
    const result2 = await Announcement.update(
      {
        title: sequelize.literal("REPLACE(REPLACE(title, 'ausu', 'Baze'), 'AUSU', 'Baze')"),
        body: sequelize.literal("REPLACE(REPLACE(body, 'ausu', 'Baze'), 'AUSU', 'Baze')")
      },
      {
        where: {
          [Op.or]: [
            { title: { [Op.like]: '%ausu%' } },
            { body: { [Op.like]: '%ausu%' } }
          ]
        }
      }
    );

    console.log(`Updated ${result2[0]} more announcement(s) containing ausu.`);
    console.log('Database update complete!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();

