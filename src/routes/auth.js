const express = require('express');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, EmailVerification } = require('../models');
// Email service only used for password reset now
const emailService = require('../services/emailService');
const analyticsService = require('../services/analyticsService');
const layoutHook = require('../views/_layout_hook');

const router = express.Router();
router.use(layoutHook);

router.get('/login', (req, res) => {
  if (req.session.userId) {
    const redirect = req.query.redirect || '/';
    return res.redirect(redirect);
  }
  res.render('accounts/login', { title: 'Login', redirect: req.query.redirect || null });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    console.log(`[LOGIN ATTEMPT] Username/Email: ${username || 'empty'}`);
    
    if (!username || !password) {
      console.log('[LOGIN] ❌ Missing username or password');
      req.flash('error', 'Username and password are required.');
      return res.redirect('/accounts/login');
    }

    // Allow login with username or email
    console.log('[LOGIN] 🔍 Searching for user in database...');
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      } 
    });
    
    if (!user) {
      console.log('[LOGIN] ❌ User not found in database');
      req.flash('error', 'Invalid credentials.');
      return res.redirect('/accounts/login');
    }
    
    console.log(`[LOGIN] ✅ User found: ${user.username} (ID: ${user.id})`);
    console.log('[LOGIN] 🔐 Verifying password...');

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) {
      console.log('[LOGIN] ❌ Password mismatch');
      req.flash('error', 'Invalid credentials.');
      return res.redirect('/accounts/login');
    }
    
    console.log('[LOGIN] ✅ Password verified successfully');

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.isSuperuser = user.isSuperuser;
    
    console.log(`[LOGIN] ✅ Session created for user: ${user.username} (Role: ${user.role}, Superuser: ${user.isSuperuser})`);
    
    // Track login analytics
    try {
    analyticsService.trackEvent('LOGIN', user.id, null, req);
    } catch (e) {
      console.log('[LOGIN] ⚠️  Analytics tracking failed (non-critical):', e.message);
    }
    
    req.flash('success', 'Welcome back!');
    console.log('[LOGIN] ✅ Login successful, redirecting...');
    const redirect = req.query.redirect || req.body.redirect || '/';
    return res.redirect(redirect);
  } catch (e) {
    console.error('[LOGIN] ❌ ERROR:', e);
    req.flash('error', 'Login failed.');
    return res.redirect('/accounts/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Registration routes
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('accounts/register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, firstName, lastName, terms } = req.body || {};
    
    // Validation
    if (!username || !email || !password || !confirmPassword || !firstName || !lastName) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/accounts/register');
    }
    
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/accounts/register');
    }
    
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters.');
      return res.redirect('/accounts/register');
    }
    
    if (!terms) {
      req.flash('error', 'You must agree to the terms and conditions.');
      return res.redirect('/accounts/register');
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ username }, { email }] }
    });
    
    if (existingUser) {
      req.flash('error', 'Username or email already exists.');
      return res.redirect('/accounts/register');
    }
    
    // Create user (use build instead of create to set password before saving)
    const user = User.build({
      username,
      email,
      firstName,
      lastName,
      role: 'MEMBER',
      isSuperuser: false,
      emailVerified: true // Automatically verify email - no verification required
    });
    
    await user.setPassword(password);
    await user.save();
    
    console.log(`[REGISTER] ✅ User registered: ${username} (Email: ${email})`);
    
    // Track registration analytics
    try {
    analyticsService.trackEvent('REGISTER', user.id, null, req);
    } catch (e) {
      console.log('[REGISTER] ⚠️  Analytics tracking failed (non-critical):', e.message);
    }
    
    req.flash('success', 'Registration successful! You can now log in.');
    res.redirect('/accounts/login');
  } catch (e) {
    console.error('Registration error:', e);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/accounts/register');
  }
});

// Email verification routes - REMOVED (email verification no longer required)

// Password reset routes
router.get('/forgot-password', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('accounts/forgot-password', { title: 'Forgot Password' });
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      req.flash('error', 'Email address is required.');
      return res.redirect('/accounts/forgot-password');
    }
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Don't reveal if email exists or not
      req.flash('success', 'If an account with that email exists, a password reset link has been sent.');
      return res.redirect('/accounts/login');
    }
    
    // Generate reset token
    const token = emailService.generateToken();
    await EmailVerification.create({
      userId: user.id,
      token,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });
    
    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(email, token, user.username);
    
    if (emailSent) {
      req.flash('success', 'Password reset link has been sent to your email.');
    } else {
      req.flash('error', 'Failed to send password reset email. Please try again.');
    }
    
    res.redirect('/accounts/login');
  } catch (e) {
    console.error('Forgot password error:', e);
    req.flash('error', 'Failed to process request. Please try again.');
    res.redirect('/accounts/forgot-password');
  }
});

router.get('/reset-password', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      req.flash('error', 'Invalid reset link.');
      return res.redirect('/accounts/login');
    }
    
    const verification = await EmailVerification.findOne({
      where: { 
        token, 
        type: 'PASSWORD_RESET',
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    
    if (!verification) {
      req.flash('error', 'Reset link is invalid or has expired.');
      return res.redirect('/accounts/login');
    }
    
    res.render('accounts/reset-password', { 
      title: 'Reset Password', 
      token 
    });
  } catch (e) {
    console.error('Reset password error:', e);
    req.flash('error', 'Failed to load reset page.');
    res.redirect('/accounts/login');
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    if (!token || !password || !confirmPassword) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/accounts/login');
    }
    
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect(`/accounts/reset-password?token=${token}`);
    }
    
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters.');
      return res.redirect(`/accounts/reset-password?token=${token}`);
    }
    
    const verification = await EmailVerification.findOne({
      where: { 
        token, 
        type: 'PASSWORD_RESET',
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [User]
    });
    
    if (!verification) {
      req.flash('error', 'Reset link is invalid or has expired.');
      return res.redirect('/accounts/login');
    }
    
    // Update password
    await verification.User.setPassword(password);
    await verification.User.save();
    
    // Mark token as used
    await verification.update({ used: true });
    
    req.flash('success', 'Password updated successfully. You can now sign in.');
    res.redirect('/accounts/login');
  } catch (e) {
    console.error('Reset password error:', e);
    req.flash('error', 'Failed to reset password. Please try again.');
    res.redirect('/accounts/login');
  }
});

module.exports = router;
