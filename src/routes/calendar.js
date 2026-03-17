const express = require('express');
const { Op } = require('sequelize');
const { CalendarEvent, User } = require('../models');
const { requireAuth, requireExecutiveOrAdmin } = require('../middleware/auth');
const layoutHook = require('../views/_layout_hook');

const router = express.Router();
router.use(layoutHook);

/* LIST EVENTS */
router.get('/', async (req, res) => {
  try {
    const user = res.locals.currentUser;
    const where = {};
    
    // If not logged in or not admin/executive, only show public events
    if (!user || !(user.isSuperuser || user.role === 'ADMIN' || user.role === 'EXECUTIVE')) {
      where.isPublic = true;
    }
    
    // Filter by date range if provided
    const { month, year } = req.query;
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      where.startDate = { [Op.between]: [startDate, endDate] };
    }
    
    // Show upcoming events by default (or all if admin)
    if (!month || !year) {
      if (!user || !(user.isSuperuser || user.role === 'ADMIN')) {
        where.startDate = { [Op.gte]: new Date() };
      }
    }
    
    const events = await CalendarEvent.findAll({
      where,
      include: [{
        model: User,
        as: 'Organizer',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }],
      order: [['startDate', 'ASC']]
    });
    
    res.render('calendar/list', {
      title: 'Calendar Events',
      events: events || [],
      currentUser: user
    });
  } catch (e) {
    console.error('Calendar list error:', e);
    req.flash('error', 'Failed to load calendar events.');
    res.redirect('/');
  }
});

/* CREATE (form) */
router.get('/create', requireAuth, requireExecutiveOrAdmin, (req, res) => {
  res.render('calendar/create', { title: 'Create Calendar Event' });
});

/* CREATE (submit) */
router.post('/create', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  const { title, description, startDate, endDate, location, isPublic, eventType } = req.body;
  try {
    await CalendarEvent.create({
      title,
      description: description || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location: location || null,
      isPublic: !!isPublic,
      eventType: eventType || 'EVENT',
      organizerId: res.locals.currentUser.id
    });
    req.flash('success', 'Calendar event created.');
  } catch (e) {
    console.error('Calendar create error:', e);
    req.flash('error', 'Failed to create calendar event.');
  }
  res.redirect('/calendar');
});

/* EDIT (form) */
router.get('/:id/edit', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  try {
    const event = await CalendarEvent.findByPk(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found.');
      return res.redirect('/calendar');
    }
    res.render('calendar/edit', { title: 'Edit Calendar Event', event });
  } catch (e) {
    console.error('Calendar edit form error:', e);
    req.flash('error', 'Failed to load edit form.');
    res.redirect('/calendar');
  }
});

/* EDIT (submit) */
router.post('/:id/edit', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  const { title, description, startDate, endDate, location, isPublic, eventType } = req.body;
  try {
    const event = await CalendarEvent.findByPk(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found.');
      return res.redirect('/calendar');
    }
    await event.update({
      title,
      description: description || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location: location || null,
      isPublic: !!isPublic,
      eventType: eventType || 'EVENT'
    });
    req.flash('success', 'Calendar event updated.');
  } catch (e) {
    console.error('Calendar update error:', e);
    req.flash('error', 'Failed to update calendar event.');
  }
  res.redirect('/calendar');
});

/* DELETE */
router.post('/:id/delete', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  try {
    await CalendarEvent.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Calendar event deleted.');
  } catch (e) {
    console.error('Calendar delete error:', e);
    req.flash('error', 'Failed to delete calendar event.');
  }
  res.redirect('/calendar');
});

module.exports = router;

