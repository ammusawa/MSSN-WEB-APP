require('dotenv').config();
const { Sequelize } = require('sequelize');
const { sequelize: appSequelize } = require('../src/models');

const dialect = process.env.DB_DIALECT || 'sqlite';
const dbName = process.env.DB_NAME || 'mssn_repo';

(async () => {
  try {
    console.log('🔧 Starting database setup...\n');

    // Step 1: Create database if MySQL or PostgreSQL
    if (dialect === 'mysql') {
      console.log('📦 Step 1: Creating MySQL database...');
      const serverSequelize = new Sequelize('', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false
      });

      try {
        await serverSequelize.authenticate();
        console.log('✅ Connected to MySQL server');

        await serverSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.log(`✅ Database '${dbName}' is ready\n`);

        await serverSequelize.close();
      } catch (e) {
        console.error('❌ Error creating MySQL database:', e.message);
        console.error('\nMake sure:');
        console.error('1. MySQL server is running');
        console.error('2. DB_USER and DB_PASSWORD in .env are correct');
        console.error('3. MySQL user has permission to create databases');
        process.exit(1);
      }
    } else if (dialect === 'postgres' || dialect === 'postgresql') {
      console.log('📦 Step 1: Creating PostgreSQL database...');
      const serverSequelize = new Sequelize('postgres', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD || '', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
      });

      try {
        await serverSequelize.authenticate();
        console.log('✅ Connected to PostgreSQL server');

        // Check if database exists
        const [results] = await serverSequelize.query(
          `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
        );

        if (results.length === 0) {
          await serverSequelize.query(`CREATE DATABASE "${dbName}";`);
          console.log(`✅ Database '${dbName}' created\n`);
        } else {
          console.log(`✅ Database '${dbName}' already exists\n`);
        }

        await serverSequelize.close();
      } catch (e) {
        console.error('❌ Error creating PostgreSQL database:', e.message);
        console.error('\nMake sure:');
        console.error('1. PostgreSQL server is running');
        console.error('2. DB_USER and DB_PASSWORD in .env are correct');
        console.error('3. PostgreSQL user has permission to create databases');
        process.exit(1);
      }
    } else {
      console.log(`📦 Step 1: Using ${dialect} database (no database creation needed)\n`);
    }

    // Step 2: Sync schema
    console.log('📐 Step 2: Syncing database schema...');
    await appSequelize.authenticate();
    console.log('✅ Connected to database');

    await appSequelize.sync({ alter: true });
    console.log('✅ Database schema synced successfully\n');

    console.log('✨ Database setup completed!\n');
    console.log('📝 Next step: Run "npm run seed" to populate initial data');
    
    await appSequelize.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Database setup error:', e);
    process.exit(1);
  }
})();

