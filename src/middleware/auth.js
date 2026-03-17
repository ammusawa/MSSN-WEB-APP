const jwt = require('jsonwebtoken');
const { User } = require('../models');

function requireAuth(req, res, next) {
  if (req.session.userId) return next();
  req.flash('error','Please login.');
  return res.redirect('/accounts/login');
}
function requireExecutiveOrAdmin(req, res, next) {
  const u = res.locals.currentUser;
  if (u && (u.isSuperuser || u.role === 'ADMIN' || u.role === 'EXECUTIVE')) return next();
  req.flash('error','Not authorized.');
  return res.redirect('/');
}
async function attachUserToLocals(req, res, next) {
  res.locals.messages = { error: req.flash('error'), success: req.flash('success') };
  if (!req.session.userId) { res.locals.currentUser = null; return next(); }
  try { res.locals.currentUser = await User.findByPk(req.session.userId); } catch { res.locals.currentUser = null; }
  next();
}
function issueJWT(user){
  return jwt.sign({ uid: user.id, role: user.role }, process.env.SESSION_SECRET || 'dev', { expiresIn: '1h' });
}
module.exports = { requireAuth, requireExecutiveOrAdmin, attachUserToLocals, issueJWT };
