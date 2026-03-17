function requireAdmin(req, res, next) {
  const u = res.locals.currentUser;
  if (!u) { req.flash('error','Please login.'); return res.redirect('/accounts/login'); }
  if (u.isSuperuser) return next();
  if (u.role === 'ADMIN') return next();
  req.flash('error','Admin only.');
  return res.redirect('/');
}
module.exports = { requireAdmin };