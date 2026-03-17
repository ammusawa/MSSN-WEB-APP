require('dotenv').config();
const { sequelize, CalendarEvent, User } = require('../src/models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    const admin = await User.findOne({ where: { username: 'admin' } });
    if (!admin) {
      console.error('❌ Admin user not found. Please run: npm run seed:admin');
      process.exit(1);
    }

    // Clear existing seed events (optional - comment out if you want to keep existing)
    // await CalendarEvent.destroy({ where: {} });
    // console.log('🧹 Cleared existing calendar events');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const events = [
      {
        title: 'Friday Jumu\'ah Prayer',
        description: 'Weekly congregational Friday prayer service. All members are welcome to attend.',
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 30, 0),
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30, 0),
        location: 'Main Hall',
        isPublic: true,
        eventType: 'EVENT',
        organizerId: admin.id
      },
      {
        title: 'Weekly Tafsir Study Session',
        description: 'Join us for our weekly study of Quranic exegesis. This week\'s topic: Surah Al-Baqarah, Verses 1-50.',
        startDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 18, 0, 0),
        endDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 20, 0, 0),
        location: 'Study Room',
        isPublic: true,
        eventType: 'LECTURE',
        organizerId: admin.id
      },
      {
        title: 'Executive Committee Meeting',
        description: 'Monthly meeting for executive members to discuss organizational matters and plan upcoming activities.',
        startDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 17, 0, 0),
        endDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 19, 0, 0),
        location: 'Conference Room',
        isPublic: false,
        eventType: 'MEETING',
        organizerId: admin.id
      },
      {
        title: 'Ramadan Iftar Program',
        description: 'Community iftar gathering during the blessed month of Ramadan. Open to all members and their families.',
        startDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15, 18, 30, 0),
        endDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15, 20, 30, 0),
        location: 'Main Hall',
        isPublic: true,
        eventType: 'EVENT',
        organizerId: admin.id
      },
      {
        title: 'Eid Al-Fitr Celebration',
        description: 'Join us for Eid prayers and celebration. Food and refreshments will be served after prayers.',
        startDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10, 8, 0, 0),
        endDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10, 13, 0, 0),
        location: 'Main Hall',
        isPublic: true,
        eventType: 'HOLIDAY',
        organizerId: admin.id
      },
      {
        title: 'Youth Halaqah Session',
        description: 'Special session for young members. Interactive discussion and activities focused on Islamic teachings.',
        startDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 15, 0, 0),
        endDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 16, 30, 0),
        location: 'Youth Center',
        isPublic: true,
        eventType: 'LECTURE',
        organizerId: admin.id
      },
      {
        title: 'Community Service Day',
        description: 'Volunteer opportunity to serve our local community. We will be organizing a food drive and neighborhood cleanup.',
        startDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 3, 9, 0, 0),
        endDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 3, 13, 0, 0),
        location: 'Various Locations',
        isPublic: true,
        eventType: 'EVENT',
        organizerId: admin.id
      },
      {
        title: 'Arabic Language Class',
        description: 'Weekly Arabic language learning session. Open to all skill levels. Bring your notebooks!',
        startDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 3, 19, 0, 0),
        endDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 3, 20, 30, 0),
        location: 'Classroom A',
        isPublic: true,
        eventType: 'LECTURE',
        organizerId: admin.id
      },
      {
        title: 'Eid Al-Adha Prayer',
        description: 'Eid Al-Adha congregational prayer followed by community gathering.',
        startDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 2, 16, 8, 30, 0),
        endDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 2, 16, 12, 0, 0),
        location: 'Main Hall',
        isPublic: true,
        eventType: 'HOLIDAY',
        organizerId: admin.id
      },
      {
        title: 'New Member Orientation',
        description: 'Welcome session for new members to learn about the organization, activities, and meet current members.',
        startDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 5, 14, 0, 0),
        endDate: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 5, 16, 0, 0),
        location: 'Welcome Center',
        isPublic: true,
        eventType: 'MEETING',
        organizerId: admin.id
      }
    ];

    console.log(`\n📅 Creating ${events.length} calendar events...\n`);

    for (const eventData of events) {
      try {
        const event = await CalendarEvent.create(eventData);
        const startDate = new Date(eventData.startDate);
        console.log(`✅ Created: "${event.title}" - ${startDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`);
      } catch (err) {
        console.error(`❌ Failed to create "${eventData.title}":`, err.message);
      }
    }

    const totalEvents = await CalendarEvent.count();
    console.log(`\n✨ Successfully seeded calendar! Total events in database: ${totalEvents}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error seeding calendar events:', e);
    process.exit(1);
  }
})();

