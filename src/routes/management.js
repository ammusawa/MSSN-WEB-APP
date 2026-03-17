const express = require('express');
const layoutHook = require('../views/_layout_hook');
const { ManagementMember, User } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();
router.use(layoutHook);

// Public route - view management
router.get('/', async (req, res) => {
  try {
    const [members, admins] = await Promise.all([
      ManagementMember.findAll({
        where: { isActive: true },
        order: [
          ['category', 'ASC'],
          ['order', 'ASC'],
          ['name', 'ASC']
        ]
      }),
      User.findAll({
        where: {
          [Op.or]: [
            { role: 'ADMIN' },
            { isSuperuser: true }
          ]
        },
        order: [['username', 'ASC']]
      })
    ]);

    // Map admin accounts to "Ameer" display entries
    const adminEntries = admins.map(admin => ({
      name: [admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.username,
      position: 'Ameer (Admin)',
      email: admin.email || null,
      phone: null,
      bio: null,
      photo: null,
      category: 'AMEER',
      order: -1, // Ensure admins appear first in Ameer list
      isActive: true
    }));

    // Group by category
    const grouped = {
      AMEER: [],
      EXECUTIVE: [],
      LEADER: [],
      EXCO: [],
      OTHER: []
    };

    // Add admin entries first
    adminEntries.forEach(member => {
      grouped.AMEER.push(member);
    });

    members.forEach(member => {
      if (grouped[member.category]) {
        grouped[member.category].push(member);
      }
    });

    res.render('management/index', {
      title: 'Management',
      grouped,
      members
    });
  } catch (error) {
    console.error('Management view error:', error);
    req.flash('error', 'Failed to load management information.');
    res.redirect('/');
  }
});

module.exports = router;

