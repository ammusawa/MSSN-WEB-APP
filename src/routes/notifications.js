const express = require('express');
const { Notification } = require('../models');
const notificationService = require('../services/notificationService');
const { requireAuth } = require('../middleware/auth');
const layoutHook = require('../views/_layout_hook');

const router = express.Router();
router.use(layoutHook);
router.use(requireAuth);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    const notifications = await notificationService.getUserNotifications(req.session.userId, {
      limit,
      offset,
      unreadOnly
    });

    const unreadCount = await notificationService.getUnreadCount(req.session.userId);

    res.render('notifications/list', {
      title: 'Notifications',
      notifications,
      unreadCount,
      pagination: {
        currentPage: page,
        hasNextPage: notifications.length === limit,
        nextPage: notifications.length === limit ? page + 1 : null,
        hasPrevPage: page > 1,
        prevPage: page > 1 ? page - 1 : null
      },
      filters: {
        unread: unreadOnly
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    req.flash('error', 'Failed to load notifications.');
    res.redirect('/');
  }
});

// Mark notification as read
router.post('/:id/read', async (req, res) => {
  try {
    const success = await notificationService.markAsRead(req.params.id, req.session.userId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Notification not found' });
    }
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', async (req, res) => {
  try {
    const success = await notificationService.markAllAsRead(req.session.userId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
    }
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get unread count (API endpoint)
router.get('/unread-count', async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.session.userId);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ count: 0 });
  }
});

module.exports = router;
