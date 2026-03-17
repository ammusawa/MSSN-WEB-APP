require('dotenv').config();
const { ManagementMember, User } = require('../src/models');

const seedMembers = [
  {
    name: 'Abdulrahman Yusuf',
    position: 'Ameer (President)',
    category: 'AMEER',
    email: 'ameer@example.com',
    phone: '+2348000000001',
    bio: 'Leads MSSN Baze vision, strategy, and community engagement.',
    order: 1
  },
  {
    name: 'Maryam Bello',
    position: 'Vice Ameer',
    category: 'EXECUTIVE',
    email: 'viceameer@example.com',
    phone: '+2348000000002',
    bio: 'Supports the Ameer and coordinates executive activities.',
    order: 2
  },
  {
    name: 'Khalid Musa',
    position: 'General Secretary',
    category: 'EXECUTIVE',
    email: 'secretary@example.com',
    phone: '+2348000000003',
    bio: 'Oversees communications and documentation for MSSN Baze.',
    order: 3
  },
  {
    name: 'Fatimah Sani',
    position: 'Head of Academics',
    category: 'LEADER',
    email: 'academics@example.com',
    phone: '+2348000000004',
    bio: 'Coordinates academic support, study circles, and resources.',
    order: 4
  },
  {
    name: 'Ibrahim Aliyu',
    position: 'Head of Welfare',
    category: 'EXCO',
    email: 'welfare@example.com',
    phone: '+2348000000005',
    bio: 'Leads welfare initiatives and community support programs.',
    order: 5
  },
];

(async () => {
  try {
    // Optional: link the first member to the admin user if it exists
    const adminUser = await User.findOne({ where: { username: 'admin' } });

    for (const member of seedMembers) {
      const [record, created] = await ManagementMember.findOrCreate({
        where: { name: member.name, position: member.position },
        defaults: {
          email: member.email,
          phone: member.phone,
          bio: member.bio,
          category: member.category,
          order: member.order,
          isActive: true,
          userId: member.name === 'Abdulrahman Yusuf' && adminUser ? adminUser.id : null,
        },
      });

      console.log(created
        ? `Created management member: ${record.name}`
        : `Skipped (exists): ${record.name}`);
    }

    console.log('✅ Management members seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Management seed failed:', err);
    process.exit(1);
  }
})();

