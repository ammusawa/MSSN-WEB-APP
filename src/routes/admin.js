const express = require('express');
const PDFDocument = require('pdfkit');
const layoutHook = require('../views/_layout_hook');
const { requireAdmin } = require('../middleware/admin');
const { requirePerm } = require('../middleware/perm');
const {
  User, ResourceCategory, Resource, Announcement, Donation, Meeting, CalendarEvent, ManagementMember,
  Role, UserRole, Analytics
} = require('../models');
const analyticsService = require('../services/analyticsService');
const notificationService = require('../services/notificationService');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(layoutHook);
router.use(requireAdmin);
router.use(requirePerm('admin.access'));

// Redirect /admin to /admin/dashboard
router.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/dashboard', async (req, res) => {
  const [users, resources, announcements, donations, meetings] = await Promise.all([
    User.count(), Resource.count(), Announcement.count(),
    Donation.count({ where: { status: 'SUCCESS' } }),
    Meeting.count({ where: { isActive: true } })
  ]);
  
  const [latestDonations, analytics] = await Promise.all([
    Donation.findAll({
      where: { status: 'SUCCESS' },
      order: [['createdAt','DESC']],
      limit: 10
    }),
    analyticsService.getDashboardStats()
  ]);
  
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    totals: { users, resources, announcements, donations, meetings },
    latestDonations,
    analytics
  });
});

router.get('/users', async (req, res) => {
  const q = req.query.q || '';
  const where = q
    ? {
        [Op.or]: [
          { username:  { [Op.like]: `%${q}%` } },
          { email:     { [Op.like]: `%${q}%` } },
          { firstName: { [Op.like]: `%${q}%` } },
          { lastName:  { [Op.like]: `%${q}%` } },
        ]
      }
    : {};

  const [users, roles] = await Promise.all([
    User.findAll({ where, order: [['createdAt','DESC']], limit: 200 }),
    Role.findAll({ order: [['name','ASC']] })
  ]);

  res.render('admin/users/list', { title: 'Users', users, q, roles });
});

router.get('/users/new', async (req, res) => {
  const roles = await Role.findAll({ order: [['name','ASC']] });
  res.render('admin/users/new', { title: 'Onboard New User', roles });
});

router.post('/users/create', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    let roles = req.body.roles || [];
    if (!Array.isArray(roles)) roles = [roles].filter(Boolean);

    if (!username || !email || !password) {
      req.flash('error', 'Username, Email, and Password are required.');
      return res.redirect(req.header('Referer') || '/admin/users/new');
    }

    const exists = await User.findOne({
      where: { [Op.or]: [{ username }, { email }] }
    });
    if (exists) {
      req.flash('error', 'Username or Email already exists.');
      return res.redirect(req.header('Referer') || '/admin/users/new');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      passwordHash,
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || 'MEMBER',
      isSuperuser: false,
    });

    if (roles.length) {
      const roleRows = await Role.findAll({ where: { id: roles } });
      for (const r of roleRows) {
        await UserRole.findOrCreate({ where: { userId: user.id, roleId: r.id } });
      }
    }

    req.flash('success', `User "${username}" created successfully.`);
    return res.redirect('/admin/users');
  } catch (e) {
    console.error('Onboard user error:', e);
    req.flash('error', 'Failed to create user.');
    return res.redirect(req.header('Referer') || '/admin/users/new');
  }
});

router.post('/users/:id/role', async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (u) {
      await u.update({ role: req.body.role || 'MEMBER' });
      req.flash('success','Role updated.');
    }
  } catch (e) { console.error(e); req.flash('error','Failed.'); }
  res.redirect('/admin/users');
});

router.post('/users/:id/password', async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (u) {
      u.passwordHash = await bcrypt.hash(req.body.password || 'admin1234', 10);
      await u.save();
      req.flash('success','Password reset.');
    }
  } catch (e) { console.error(e); req.flash('error','Failed.'); }
  res.redirect('/admin/users');
});

router.post('/users/:id/delete', async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id } });
    req.flash('success','User deleted.');
  } catch (e) { console.error(e); req.flash('error','Failed.'); }
  res.redirect('/admin/users');
});

// Management routes
router.get('/users/management', async (req, res) => {
  try {
    const members = await ManagementMember.findAll({
      include: [{ model: User, as: 'User', attributes: ['id', 'username', 'email'] }],
      order: [
        ['category', 'ASC'],
        ['order', 'ASC'],
        ['name', 'ASC']
      ]
    });

    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'firstName', 'lastName'],
      order: [['username', 'ASC']]
    });

    res.render('admin/users/management', {
      title: 'Management',
      members,
      users
    });
  } catch (error) {
    console.error('Management admin error:', error);
    req.flash('error', 'Failed to load management.');
    res.redirect('/admin/users');
  }
});

router.get('/users/management/new', async (req, res) => {
  const users = await User.findAll({
    attributes: ['id', 'username', 'email', 'firstName', 'lastName'],
    order: [['username', 'ASC']]
  });
  res.render('admin/users/management_new', { title: 'Add Management Member', users });
});

router.post('/users/management/create', async (req, res) => {
  try {
    const { name, position, email, phone, bio, category, order, userId, isActive } = req.body;
    
    if (!name || !position) {
      req.flash('error', 'Name and Position are required.');
      return res.redirect('/admin/users/management/new');
    }

    await ManagementMember.create({
      name,
      position,
      email: email || null,
      phone: phone || null,
      bio: bio || null,
      category: category || 'EXECUTIVE',
      order: order ? parseInt(order) : 0,
      userId: userId ? parseInt(userId) : null,
      isActive: isActive === 'on' || isActive === true
    });

    req.flash('success', 'Management member added successfully.');
    res.redirect('/admin/users/management');
  } catch (error) {
    console.error('Create management error:', error);
    req.flash('error', 'Failed to add management member.');
    res.redirect('/admin/users/management/new');
  }
});

router.get('/users/management/:id/edit', async (req, res) => {
  try {
    const member = await ManagementMember.findByPk(req.params.id, {
      include: [{ model: User, as: 'User', attributes: ['id', 'username', 'email'] }]
    });
    
    if (!member) {
      req.flash('error', 'Management member not found.');
      return res.redirect('/admin/users/management');
    }

    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'firstName', 'lastName'],
      order: [['username', 'ASC']]
    });

    res.render('admin/users/management_edit', {
      title: 'Edit Management Member',
      member,
      users
    });
  } catch (error) {
    console.error('Edit management error:', error);
    req.flash('error', 'Failed to load management member.');
    res.redirect('/admin/users/management');
  }
});

router.post('/users/management/:id/update', async (req, res) => {
  try {
    const member = await ManagementMember.findByPk(req.params.id);
    
    if (!member) {
      req.flash('error', 'Management member not found.');
      return res.redirect('/admin/users/management');
    }

    const { name, position, email, phone, bio, category, order, userId, isActive } = req.body;

    member.name = name;
    member.position = position;
    member.email = email || null;
    member.phone = phone || null;
    member.bio = bio || null;
    member.category = category || 'EXECUTIVE';
    member.order = order ? parseInt(order) : 0;
    member.userId = userId ? parseInt(userId) : null;
    member.isActive = isActive === 'on' || isActive === true;

    await member.save();

    req.flash('success', 'Management member updated successfully.');
    res.redirect('/admin/users/management');
  } catch (error) {
    console.error('Update management error:', error);
    req.flash('error', 'Failed to update management member.');
    res.redirect(`/admin/users/management/${req.params.id}/edit`);
  }
});

router.post('/users/management/:id/delete', async (req, res) => {
  try {
    const member = await ManagementMember.findByPk(req.params.id);
    
    if (!member) {
      req.flash('error', 'Management member not found.');
      return res.redirect('/admin/users/management');
    }

    await member.destroy();
    req.flash('success', 'Management member deleted successfully.');
    res.redirect('/admin/users/management');
  } catch (error) {
    console.error('Delete management error:', error);
    req.flash('error', 'Failed to delete management member.');
    res.redirect('/admin/users/management');
  }
});

router.get('/categories', async (req, res) => {
  const categories = await ResourceCategory.findAll({ order: [['name','ASC']] });
  res.render('admin/categories/list', { title: 'Categories', categories });
});
router.post('/categories/create', async (req, res) => {
  try {
    await ResourceCategory.create({ name: req.body.name, slug: req.body.slug });
    req.flash('success','Category created.');
  } catch { req.flash('error','Failed.'); }
  res.redirect('/admin/categories');
});
router.post('/categories/:id/delete', async (req, res) => {
  try {
    await ResourceCategory.destroy({ where: { id: req.params.id } });
    req.flash('success','Category deleted.');
  } catch { req.flash('error','Failed.'); }
  res.redirect('/admin/categories');
});

router.get('/resources', async (req, res) => {
  const resources = await Resource.findAll({ order: [['createdAt','DESC']], include: [ResourceCategory] });
  res.render('admin/resources/list', { title: 'Resources', resources });
});
router.post('/resources/:id/delete', async (req, res) => {
  try {
    await Resource.destroy({ where: { id: req.params.id } });
    req.flash('success','Resource deleted.');
  } catch { req.flash('error','Failed.'); }
    res.redirect('/admin/resources');
});

router.get('/announcements', async (req, res) => {
  const announcements = await Announcement.findAll({ order: [['createdAt','DESC']] });
  res.render('admin/announcements/list', { title: 'Announcements', announcements });
});
router.post('/announcements/create', async (req, res) => {
  try {
    const announcement = await Announcement.create({
      title: req.body.title,
      body: req.body.body,
      isPublic: !!req.body.isPublic,
      authorId: res.locals.currentUser.id
    });
    
    // Send notifications to all users when announcement is published
    if (announcement && announcement.isPublic) {
      await notificationService.notifyAllUsers(
        'ANNOUNCEMENT',
        req.body.title,
        req.body.body.length > 200 ? req.body.body.substring(0, 200) + '...' : req.body.body,
        {
          actionUrl: `/announcements`
        }
      );
      console.log(`[ANNOUNCEMENTS] ✅ Sent notifications for announcement: ${req.body.title}`);
    }
    
    req.flash('success','Announcement published.');
  } catch { req.flash('error','Failed.'); }
  res.redirect('/admin/announcements');
});
router.post('/announcements/:id/delete', async (req, res) => {
  try {
    await Announcement.destroy({ where: { id: req.params.id } });
    req.flash('success','Announcement deleted.');
  } catch { req.flash('error','Failed.'); }
  res.redirect('/admin/announcements');
});

router.get('/donations', async (req, res) => {
  const donations = await Donation.findAll({ order: [['createdAt','DESC']] });
  res.render('admin/donations/list', { title: 'Donations', donations });
});
router.get('/donations/export.csv', async (req, res) => {
  const donations = await Donation.findAll({ order: [['createdAt','DESC']] });
  const rows = [['Full Name','Email','Amount','Status','Reference','Created At']].concat(
    donations.map(d => [d.fullName, d.email, d.amount, d.status, d.reference, d.createdAt.toISOString()])
  );
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="donations.csv"');
  res.send(rows.map(r => r.map(v => `"${String(v).replace('"','""')}"`).join(',')).join('\n'));
});

router.get('/donations/export.pdf', async (req, res) => {
  try {
    const donations = await Donation.findAll({ order: [['createdAt','DESC']] });
    
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="donations.pdf"');
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('Donations Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.fontSize(10).text(`Total Donations: ${donations.length}`, { align: 'center' });
    doc.moveDown(2);
    
    // Table setup
    const tableTop = doc.y;
    const tableLeft = 50;
    const tableWidth = 500;
    const rowHeight = 25;
    const headerHeight = 30;
    const columnWidths = {
      name: 100,
      email: 120,
      amount: 70,
      status: 70,
      reference: 100,
      date: 90
    };
    
    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    let x = tableLeft;
    doc.rect(x, tableTop, columnWidths.name, headerHeight).stroke();
    doc.text('Name', x + 5, tableTop + 8);
    x += columnWidths.name;
    
    doc.rect(x, tableTop, columnWidths.email, headerHeight).stroke();
    doc.text('Email', x + 5, tableTop + 8);
    x += columnWidths.email;
    
    doc.rect(x, tableTop, columnWidths.amount, headerHeight).stroke();
    doc.text('Amount', x + 5, tableTop + 8);
    x += columnWidths.amount;
    
    doc.rect(x, tableTop, columnWidths.status, headerHeight).stroke();
    doc.text('Status', x + 5, tableTop + 8);
    x += columnWidths.status;
    
    doc.rect(x, tableTop, columnWidths.reference, headerHeight).stroke();
    doc.text('Reference', x + 5, tableTop + 8);
    x += columnWidths.reference;
    
    doc.rect(x, tableTop, columnWidths.date, headerHeight).stroke();
    doc.text('Date', x + 5, tableTop + 8);
    
    // Table rows
    doc.font('Helvetica');
    let currentY = tableTop + headerHeight;
    
    donations.forEach((donation, index) => {
      // Check if we need a new page
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        
        // Redraw header on new page
        x = tableLeft;
        doc.font('Helvetica-Bold');
        doc.rect(x, currentY, columnWidths.name, headerHeight).stroke();
        doc.text('Name', x + 5, currentY + 8);
        x += columnWidths.name;
        doc.rect(x, currentY, columnWidths.email, headerHeight).stroke();
        doc.text('Email', x + 5, currentY + 8);
        x += columnWidths.email;
        doc.rect(x, currentY, columnWidths.amount, headerHeight).stroke();
        doc.text('Amount', x + 5, currentY + 8);
        x += columnWidths.amount;
        doc.rect(x, currentY, columnWidths.status, headerHeight).stroke();
        doc.text('Status', x + 5, currentY + 8);
        x += columnWidths.status;
        doc.rect(x, currentY, columnWidths.reference, headerHeight).stroke();
        doc.text('Reference', x + 5, currentY + 8);
        x += columnWidths.reference;
        doc.rect(x, currentY, columnWidths.date, headerHeight).stroke();
        doc.text('Date', x + 5, currentY + 8);
        currentY += headerHeight;
        doc.font('Helvetica');
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(tableLeft, currentY, tableWidth, rowHeight).fillColor('#f5f5f5').fill();
        doc.fillColor('black');
      }
      
      // Draw row cells
      x = tableLeft;
      doc.rect(x, currentY, columnWidths.name, rowHeight).stroke();
      doc.text(donation.fullName || '', x + 5, currentY + 7, { width: columnWidths.name - 10, ellipsis: true });
      x += columnWidths.name;
      
      doc.rect(x, currentY, columnWidths.email, rowHeight).stroke();
      doc.text(donation.email || '', x + 5, currentY + 7, { width: columnWidths.email - 10, ellipsis: true });
      x += columnWidths.email;
      
      doc.rect(x, currentY, columnWidths.amount, rowHeight).stroke();
      doc.text(`₦${donation.amount || 0}`, x + 5, currentY + 7);
      x += columnWidths.amount;
      
      doc.rect(x, currentY, columnWidths.status, rowHeight).stroke();
      doc.text(donation.status || '', x + 5, currentY + 7);
      x += columnWidths.status;
      
      doc.rect(x, currentY, columnWidths.reference, rowHeight).stroke();
      doc.text(donation.reference || '', x + 5, currentY + 7, { width: columnWidths.reference - 10, ellipsis: true });
      x += columnWidths.reference;
      
      doc.rect(x, currentY, columnWidths.date, rowHeight).stroke();
      doc.text(new Date(donation.createdAt).toLocaleDateString(), x + 5, currentY + 7);
      
      currentY += rowHeight;
    });
    
    // Summary
    doc.moveDown(2);
    const successCount = donations.filter(d => d.status === 'SUCCESS').length;
    const totalAmount = donations.filter(d => d.status === 'SUCCESS').reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
    
    doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Donations: ${donations.length}`);
    doc.text(`Successful Donations: ${successCount}`);
    doc.text(`Total Amount: ₦${totalAmount.toLocaleString()}`);
    
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    req.flash('error', 'Failed to generate PDF export.');
    res.redirect('/admin/donations');
  }
});

router.get('/analysis', async (req, res) => {
  try {
    const [userStats, contentStats, activityStats] = await Promise.all([
      // User statistics
      Promise.all([
        User.count(),
        User.count({ where: { isSuperuser: true } }),
        User.count({ where: { role: 'ADMIN' } }),
        User.count({ where: { role: 'EXECUTIVE' } }),
        User.count({ where: { role: 'MEMBER' } }),
        User.findAll({
          attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
          order: [['createdAt', 'DESC']],
          limit: 50
        })
      ]),
      // Content statistics
      Promise.all([
        Resource.count(),
        ResourceCategory.count(),
        Announcement.count(),
        CalendarEvent.count(),
        Donation.count({ where: { status: 'SUCCESS' } }),
        Resource.findAll({
          attributes: ['id', 'title', 'categoryId', 'uploaderId', 'createdAt'],
          include: [{ model: ResourceCategory, attributes: ['name'] }],
          order: [['createdAt', 'DESC']],
          limit: 50
        })
      ]),
      // Activity statistics
      analyticsService.getDashboardStats()
    ]);

    const [totalUsers, superusers, admins, executives, members, recentUsers] = userStats;
    const [totalResources, totalCategories, totalAnnouncements, totalEvents, totalDonations, recentResources] = contentStats;

    res.render('admin/analysis', {
      title: 'Analysis',
      userStats: {
        total: totalUsers,
        superusers,
        admins,
        executives,
        members,
        recent: recentUsers
      },
      contentStats: {
        resources: totalResources,
        categories: totalCategories,
        announcements: totalAnnouncements,
        events: totalEvents,
        donations: totalDonations,
        recent: recentResources
      },
      activityStats
    });
  } catch (e) {
    console.error('Analysis error:', e);
    req.flash('error', 'Failed to load analysis data.');
    res.redirect('/admin/dashboard');
  }
});

module.exports = router;