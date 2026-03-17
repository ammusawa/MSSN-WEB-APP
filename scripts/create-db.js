require('dotenv').config();
const { Sequelize } = require('sequelize');

// Connect to MySQL server (without database)
const sequelize = new Sequelize('', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: console.log
});

const dbName = process.env.DB_NAME || 'mssn_repo';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to MySQL server.');

    // Create database if it doesn't exist
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Database '${dbName}' is ready.`);

    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    console.error('\nMake sure:');
    console.error('1. MySQL server is running');
    console.error('2. DB_USER and DB_PASSWORD in .env are correct');
    console.error('3. MySQL user has permission to create databases');
    process.exit(1);
  }
})();

