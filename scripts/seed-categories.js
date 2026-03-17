require('dotenv').config();
const slugify = require('slugify');
const { ResourceCategory } = require('../src/models');
(async()=>{
  try {
    const names = ['Quran','Hadith','Fiqh','Aqeedah','Lectures','Events'];
    for (const n of names) {
      const slug = slugify(n, { lower: true });
      await ResourceCategory.findOrCreate({ where: { slug }, defaults: { name: n, slug } });
    }
    console.log('Categories seeded.');
    process.exit(0);
  } catch(e){ console.error(e); process.exit(1); }
})();
