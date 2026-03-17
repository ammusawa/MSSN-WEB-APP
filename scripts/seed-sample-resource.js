require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, ResourceCategory, Resource, User } = require('../src/models');

(async () => {
  try {
    await sequelize.authenticate();

    // Ensure uploads dir and a sample file exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'resources');
    fs.mkdirSync(uploadDir, { recursive: true });
    const sampleSrc = path.join(process.cwd(), 'public', 'images', '1.jpg');
    const sampleDst = path.join(uploadDir, 'sample.jpg');
    if (fs.existsSync(sampleSrc) && !fs.existsSync(sampleDst)) {
      fs.copyFileSync(sampleSrc, sampleDst);
    }

    // Ensure category
    let cat = await ResourceCategory.findOne({ where: { slug: 'general' } });
    if (!cat) {
      cat = await ResourceCategory.create({ name: 'General', slug: 'general' });
    }

    // Find admin uploader if present
    const admin = await User.findOne({ where: { username: 'admin' } });

    const resource = await Resource.create({
      title: 'Sample Resource',
      description: 'Seeded sample file for admin resources page',
      categoryId: cat.id,
      fileType: 'OTHER',
      filePath: path.join('uploads', 'resources', 'sample.jpg').replace(/\\/g, '/'),
      uploaderId: admin ? admin.id : null,
    });

    console.log('Seeded resource id:', resource.id);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();


