// src/routes/announcements.js
const express = require('express');
const { requireAuth, requireExecutiveOrAdmin } = require('../middleware/auth'); // <- legacy roles
const { Announcement } = require('../models');
const notificationService = require('../services/notificationService');
const layoutHook = require('../views/_layout_hook');

const router = express.Router();
router.use(layoutHook);

/* LIST */
router.get('/', async (req, res) => {
  try {
    let items = await Announcement.findAll({ order: [['createdAt', 'DESC']] });
    const u = res.locals.currentUser;

    // Only show private items to admins/executives/superuser
    if (!u || !(u.isSuperuser || u.role === 'ADMIN' || u.role === 'EXECUTIVE')) {
      items = items.filter(i => i.isPublic);
    }

    res.render('announcements/list', { title: 'Announcements', announcements: items || [] });
  } catch (e) {
    console.error('Announcements list error:', e);
    req.flash('error', 'Failed to load announcements.');
    res.redirect('/');
  }
});

/* CREATE (form) — legacy role gate */
router.get('/create', requireAuth, requireExecutiveOrAdmin, (req, res) => {
  res.render('announcements/create', { title: 'Create Announcement' });
});

/* CREATE (submit) — legacy role gate */
router.post('/create', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  const { title, body, isPublic } = req.body;
  try {
    const announcement = await Announcement.create({
      title,
      body,
      isPublic: !!isPublic,
      authorId: res.locals.currentUser.id
    });
    
    // Send notifications to all users when announcement is published
    if (announcement && announcement.isPublic) {
      await notificationService.notifyAllUsers(
        'ANNOUNCEMENT',
        title,
        body.length > 200 ? body.substring(0, 200) + '...' : body,
        {
          actionUrl: `/announcements`
        }
      );
      console.log(`[ANNOUNCEMENTS] ✅ Sent notifications for announcement: ${title}`);
    }
    
    req.flash('success', 'Announcement published.');
  } catch (e) {
    console.error('Announcement create error:', e);
    req.flash('error', 'Failed to create announcement.');
  }
  res.redirect('/announcements');
});

/* EDIT (form) */
router.get('/:id/edit', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  try {
    const a = await Announcement.findByPk(req.params.id);
    if (!a) { req.flash('error','Announcement not found.'); return res.redirect('/announcements'); }
    res.render('announcements/edit', { title: 'Edit Announcement', a });
  } catch (e) {
    console.error('Announcement edit form error:', e);
    req.flash('error','Failed to load edit form.');
    res.redirect('/announcements');
  }
});

/* EDIT (submit) */
router.post('/:id/edit', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  const { title, body, isPublic } = req.body;
  try {
    const a = await Announcement.findByPk(req.params.id);
    if (!a) { req.flash('error','Announcement not found.'); return res.redirect('/announcements'); }
    await a.update({ title, body, isPublic: !!isPublic });
    req.flash('success','Announcement updated.');
  } catch (e) {
    console.error('Announcement update error:', e);
    req.flash('error','Failed to update announcement.');
  }
  res.redirect('/announcements');
});

/* DELETE */
router.post('/:id/delete', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  try {
    await Announcement.destroy({ where: { id: req.params.id } });
    req.flash('success','Announcement deleted.');
  } catch (e) {
    console.error('Announcement delete error:', e);
    req.flash('error','Failed to delete announcement.');
  }
  res.redirect('/announcements');
});

module.exports = router;