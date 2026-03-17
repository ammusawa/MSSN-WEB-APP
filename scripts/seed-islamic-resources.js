require('dotenv').config();
const path = require('path');
const { sequelize, ResourceCategory, Resource, User } = require('../src/models');

const islamicResources = [
  // Quran Category
  {
    title: 'Tafsir Ibn Kathir - Complete Collection',
    description: 'A comprehensive commentary on the Holy Quran by Imam Ibn Kathir. This classical tafsir provides detailed explanations of Quranic verses with references to authentic Hadith.',
    category: 'quran',
    fileType: 'PDF',
    filePath: 'uploads/resources/quran/tafsir-ibn-kathir.pdf'
  },
  {
    title: 'The Noble Quran - English Translation',
    description: 'English translation of the Holy Quran with clear and easy-to-understand language. Includes Arabic text alongside the translation.',
    category: 'quran',
    fileType: 'PDF',
    filePath: 'uploads/resources/quran/noble-quran-english.pdf'
  },
  {
    title: 'Quranic Recitation - Beautiful Tilawah',
    description: 'Audio recordings of beautiful Quranic recitations by renowned Qaris. Perfect for listening and memorization.',
    category: 'quran',
    fileType: 'AUDIO',
    filePath: 'uploads/resources/quran/beautiful-tilawah.mp3'
  },
  {
    title: 'Tafsir As-Saadi - Simplified Explanation',
    description: 'Simplified and accessible commentary on the Quran by Sheikh Abdur Rahman As-Saadi. Great for beginners and students.',
    category: 'quran',
    fileType: 'PDF',
    filePath: 'uploads/resources/quran/tafsir-saadi.pdf'
  },

  // Hadith Category
  {
    title: 'Sahih Al-Bukhari - Complete Collection',
    description: 'The most authentic collection of Hadith compiled by Imam Bukhari. Contains over 7,000 authentic narrations from Prophet Muhammad (peace be upon him).',
    category: 'hadith',
    fileType: 'PDF',
    filePath: 'uploads/resources/hadith/sahih-bukhari.pdf'
  },
  {
    title: 'Sahih Muslim - Complete Collection',
    description: 'Second most authentic Hadith collection after Sahih Bukhari. Compiled by Imam Muslim with rigorous authentication methods.',
    category: 'hadith',
    fileType: 'PDF',
    filePath: 'uploads/resources/hadith/sahih-muslim.pdf'
  },
  {
    title: '40 Hadith Nawawi - With Explanations',
    description: 'Forty carefully selected authentic Hadith compiled by Imam Nawawi. Each Hadith includes detailed explanations and benefits.',
    category: 'hadith',
    fileType: 'PDF',
    filePath: 'uploads/resources/hadith/40-hadith-nawawi.pdf'
  },
  {
    title: 'Riyadus Saliheen - Gardens of the Righteous',
    description: 'Collection of authentic Hadith on various topics including worship, manners, and character. Compiled by Imam Nawawi.',
    category: 'hadith',
    fileType: 'PDF',
    filePath: 'uploads/resources/hadith/riyadus-saliheen.pdf'
  },

  // Fiqh Category
  {
    title: 'Fiqh Made Easy - A Beginner\'s Guide',
    description: 'An accessible introduction to Islamic jurisprudence covering the basics of worship, transactions, and daily life according to Islamic law.',
    category: 'fiqh',
    fileType: 'PDF',
    filePath: 'uploads/resources/fiqh/fiqh-made-easy.pdf'
  },
  {
    title: 'Purification and Prayer - Fiqh Rules',
    description: 'Comprehensive guide to the rules of purification (wudu and ghusl) and prayer (salah) according to Islamic jurisprudence.',
    category: 'fiqh',
    fileType: 'PDF',
    filePath: 'uploads/resources/fiqh/purification-prayer.pdf'
  },
  {
    title: 'Zakat and Fasting - Fiqh Guidelines',
    description: 'Detailed explanation of Zakat (obligatory charity) and fasting (Sawm) including calculations, conditions, and exemptions.',
    category: 'fiqh',
    fileType: 'PDF',
    filePath: 'uploads/resources/fiqh/zakat-fasting.pdf'
  },
  {
    title: 'Hajj and Umrah - Complete Guide',
    description: 'Step-by-step guide to performing Hajj and Umrah according to the Sunnah. Includes maps, timings, and important supplications.',
    category: 'fiqh',
    fileType: 'PDF',
    filePath: 'uploads/resources/fiqh/hajj-umrah-guide.pdf'
  },

  // Aqeedah Category
  {
    title: 'The Fundamentals of Islamic Creed',
    description: 'Essential beliefs of Islam including Tawheed (Oneness of Allah), Prophethood, and the Hereafter. Based on authentic sources.',
    category: 'aqeedah',
    fileType: 'PDF',
    filePath: 'uploads/resources/aqeedah/fundamentals-creed.pdf'
  },
  {
    title: 'Tawheed - Monotheism in Islam',
    description: 'In-depth study of the concept of Tawheed (Oneness of Allah) and its three categories: Tawheed ar-Rububiyyah, al-Uluhiyyah, and al-Asma was-Sifaat.',
    category: 'aqeedah',
    fileType: 'PDF',
    filePath: 'uploads/resources/aqeedah/tawheed-monotheism.pdf'
  },
  {
    title: 'Belief in the Hereafter',
    description: 'Comprehensive explanation of Islamic beliefs regarding death, the grave, resurrection, judgment, and the eternal abode.',
    category: 'aqeedah',
    fileType: 'PDF',
    filePath: 'uploads/resources/aqeedah/belief-hereafter.pdf'
  },
  {
    title: 'The Beautiful Names and Attributes of Allah',
    description: 'Explanation of the 99 Names of Allah and His perfect attributes as mentioned in the Quran and Sunnah.',
    category: 'aqeedah',
    fileType: 'PDF',
    filePath: 'uploads/resources/aqeedah/names-attributes-allah.pdf'
  },

  // Lectures Category
  {
    title: 'Introduction to Islam - Complete Series',
    description: 'Comprehensive audio lecture series covering the basics of Islam for new Muslims and those seeking knowledge.',
    category: 'lectures',
    fileType: 'AUDIO',
    filePath: 'uploads/resources/lectures/intro-to-islam.mp3'
  },
  {
    title: 'The Life of Prophet Muhammad (SAW)',
    description: 'Detailed video series on the Seerah (biography) of Prophet Muhammad (peace be upon him) from birth to his passing.',
    category: 'lectures',
    fileType: 'VIDEO',
    filePath: 'uploads/resources/lectures/seerah-prophet.mp4'
  },
  {
    title: 'Daily Supplications - Audio Collection',
    description: 'Collection of authentic supplications (dua) from the Quran and Sunnah for various occasions throughout the day.',
    category: 'lectures',
    fileType: 'AUDIO',
    filePath: 'uploads/resources/lectures/daily-supplications.mp3'
  },
  {
    title: 'Friday Khutbah - Ramadan Series',
    description: 'Collection of Friday sermons (khutbah) delivered during the blessed month of Ramadan focusing on spiritual development.',
    category: 'lectures',
    fileType: 'AUDIO',
    filePath: 'uploads/resources/lectures/ramadan-khutbah.mp3'
  },
  {
    title: 'Islamic Ethics and Character Building',
    description: 'Video lecture series on developing good character and ethics according to Islamic teachings from the Quran and Sunnah.',
    category: 'lectures',
    fileType: 'VIDEO',
    filePath: 'uploads/resources/lectures/islamic-ethics.mp4'
  },
  {
    title: 'Understanding the Quran - Tafsir Lectures',
    description: 'Weekly tafsir classes explaining the meanings and lessons from various chapters (surahs) of the Holy Quran.',
    category: 'lectures',
    fileType: 'VIDEO',
    filePath: 'uploads/resources/lectures/tafsir-lectures.mp4'
  },

  // Events Category
  {
    title: 'Ramadan Iftar Program - Full Recording',
    description: 'Complete recording of our annual Ramadan iftar program including lectures, Q&A session, and community gathering.',
    category: 'events',
    fileType: 'VIDEO',
    filePath: 'uploads/resources/events/ramadan-iftar-2024.mp4'
  },
  {
    title: 'Eid Celebration - Community Event',
    description: 'Highlights from our Eid celebration event with speeches, community activities, and special programs for children.',
    category: 'events',
    fileType: 'VIDEO',
    filePath: 'uploads/resources/events/eid-celebration-2024.mp4'
  },
  {
    title: 'Islamic Conference - Knowledge Summit',
    description: 'Recordings from our annual Islamic knowledge conference featuring scholars and engaging discussions on contemporary issues.',
    category: 'events',
    fileType: 'VIDEO',
    filePath: 'uploads/resources/events/knowledge-summit-2024.mp4'
  },
  {
    title: 'Youth Program - Leadership Workshop',
    description: 'Workshop recording on developing leadership skills from an Islamic perspective for young Muslims.',
    category: 'events',
    fileType: 'VIDEO',
    filePath: 'uploads/resources/events/youth-leadership-workshop.mp4'
  }
];

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Find admin user
    const admin = await User.findOne({ where: { username: 'admin' } });
    if (!admin) {
      console.error('Admin user not found. Please run seed:admin first.');
      process.exit(1);
    }

    let seededCount = 0;
    let skippedCount = 0;

    for (const resourceData of islamicResources) {
      // Find the category
      const category = await ResourceCategory.findOne({ 
        where: { slug: resourceData.category } 
      });

      if (!category) {
        console.warn(`Category '${resourceData.category}' not found. Skipping: ${resourceData.title}`);
        skippedCount++;
        continue;
      }

      // Check if resource already exists
      const existing = await Resource.findOne({
        where: {
          title: resourceData.title,
          categoryId: category.id
        }
      });

      if (existing) {
        console.log(`Resource already exists: ${resourceData.title}`);
        skippedCount++;
        continue;
      }

      // Create the resource
      const resource = await Resource.create({
        title: resourceData.title,
        description: resourceData.description,
        categoryId: category.id,
        fileType: resourceData.fileType,
        filePath: resourceData.filePath,
        uploaderId: admin.id,
        downloads: 0
      });

      console.log(`✓ Seeded: ${resourceData.title} (${resourceData.fileType})`);
      seededCount++;
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   - Successfully seeded: ${seededCount} resources`);
    console.log(`   - Skipped (already exist): ${skippedCount} resources`);
    process.exit(0);
  } catch (e) {
    console.error('Error seeding Islamic resources:', e);
    process.exit(1);
  }
})();

