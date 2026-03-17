const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const { User, Role } = require('../models');
const layoutHook = require('../views/_layout_hook');

const router = express.Router();
router.use(layoutHook);

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(res.locals.currentUser.id, {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'isSuperuser', 'createdAt', 'updatedAt'],
      include: [{ model: Role, through: { attributes: [] }, required: false }],
    });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/accounts/login');
    }
    res.render('accounts/profile', { title: 'My Profile', user });
  } catch (e) {
    console.error('Profile error:', e);
    req.flash('error', 'Could not load profile.');
    return res.redirect('/');
  }
});
router.get('/password', requireAuth, (req, res) => {
  res.render('accounts/password', { title: 'Change Password' });
});

router.post('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/profile/password');
    }
    if (newPassword.length < 6) {
      req.flash('error', 'New password must be at least 6 characters.');
      return res.redirect('/profile/password');
    }
    if (newPassword !== confirmPassword) {
      req.flash('error', 'New passwords do not match.');
      return res.redirect('/profile/password');
    }

    const user = await User.findByPk(res.locals.currentUser.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/accounts/login');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!ok) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/profile/password');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    req.flash('success', 'Password updated successfully.');
    return res.redirect('/profile/password');
  } catch (e) {
    console.error('Change password error:', e);
    req.flash('error', 'Failed to update password.');
    return res.redirect('/profile/password');
  }
});

module.exports = router;