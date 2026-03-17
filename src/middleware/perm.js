const { User, Role, Permission } = require('../models');

function requirePerm(code) {
  return async function (req, res, next) {
    try {
      const user = res.locals.currentUser;
      if (!user) {
        req.flash('error', 'Please login.');
        return res.redirect('/accounts/login');
      }
      if (user.isSuperuser || user.role === 'ADMIN') return next();

      const u = await User.findByPk(user.id, {
        include: [{ model: Role, include: [Permission] }]
      });

      const has = !!u?.Roles?.some(r => r.Permissions?.some(p => p.code === code));
      if (has) return next();

      req.flash('error', 'Not authorized.');
      return res.redirect('/');
    } catch (e) {
      console.error('RBAC check error:', e);
      req.flash('error', 'Not authorized.');
      return res.redirect('/');
    }
  };
}

module.exports = { requirePerm };