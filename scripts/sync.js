require('dotenv').config();
const { sequelize } = require('../src/models');
(async()=>{ try{ await sequelize.sync({ alter: true }); console.log('Synced.'); process.exit(0);}catch(e){console.error(e);process.exit(1);} })();
