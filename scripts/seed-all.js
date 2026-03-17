require('dotenv').config();
const { sequelize } = require('../src/models');
const { execSync } = require('child_process');
const path = require('path');

const seedScripts = [
  { name: 'Admin User', script: 'seed-admin.js', required: true },
  { name: 'RBAC (Roles & Permissions)', script: 'seed-perms-roles.js', required: true },
  { name: 'Categories', script: 'seed-categories.js', required: false },
  { name: 'Management Members', script: 'seed-management.js', required: false },
  { name: 'Sample Announcement', script: 'seed-ann.js', required: false },
  { name: 'Calendar Events', script: 'seed-calendar.js', required: false },
  { name: 'Sample Resource', script: 'seed-sample-resource.js', required: false },
  { name: 'Islamic Resources', script: 'seed-islamic-resources.js', required: false }
];

(async () => {
  try {
    console.log('🌱 Starting seed process...\n');
    
    // Verify database connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    let successCount = 0;
    let failCount = 0;
    const scriptsDir = path.join(__dirname);

    for (const seed of seedScripts) {
      const scriptPath = path.join(scriptsDir, seed.script);
      console.log(`📦 Seeding: ${seed.name}...`);
      
      try {
        execSync(`node "${scriptPath}"`, { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log(`✅ ${seed.name} seeded successfully\n`);
        successCount++;
      } catch (error) {
        if (seed.required) {
          console.error(`❌ Failed to seed ${seed.name} (REQUIRED):`, error.message);
          console.error('⚠️  Stopping seed process due to required seed failure\n');
          process.exit(1);
        } else {
          console.warn(`⚠️  ${seed.name} seed failed (optional, continuing...):`, error.message);
          console.log('');
          failCount++;
        }
      }
    }

    console.log('════════════════════════════════════════');
    console.log('✨ Seed process completed!');
    console.log(`✅ Success: ${successCount} seed script(s)`);
    if (failCount > 0) {
      console.log(`⚠️  Skipped: ${failCount} seed script(s) (optional)`);
    }
    console.log('════════════════════════════════════════\n');

    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Seed process error:', e);
    process.exit(1);
  }
})();

