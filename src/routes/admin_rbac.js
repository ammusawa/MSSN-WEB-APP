const express = require('express');
const layoutHook = require('../views/_layout_hook');
const { requireAdmin } = require('../middleware/admin');
const { requirePerm } = require('../middleware/perm');
const {
  Role,
  Permission,
  User,
  UserRole,
  RolePermission
} = require('../models');

const router = express.Router();
router.use(layoutHook);
router.use(requireAdmin);
router.use(requirePerm('admin.access'));

router.get('/', (req, res) => res.redirect('/admin/rbac/roles'));


router.get('/roles', async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      include: [Permission],
      order: [['name', 'ASC']]
    });
    const permissions = await Permission.findAll({ order: [['code', 'ASC']] });
    return res.render('admin/rbac/roles', {
      title: 'RBAC: Roles',
      roles,
      permissions
    });
  } catch (e) {
    console.error('RBAC GET /roles error:', e);
    return next(e);
  }
});

router.post('/roles/create', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();

    if (!name) {
      req.flash('error', 'Role name is required.');
      return res.redirect('/admin/rbac/roles');
    }

    await Role.create({ name, description });
    req.flash('success', 'Role created.');
  } catch (e) {
    console.error('RBAC POST /roles/create error:', e);
    req.flash('error', 'Failed to create role.');
  }
  return res.redirect('/admin/rbac/roles');
});

router.post('/roles/:roleId/update', async (req, res) => {
  try {
    const roleId = Number(req.params.roleId);
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();

    const role = await Role.findByPk(roleId);
    if (!role) {
      req.flash('error', 'Role not found.');
      return res.redirect('/admin/rbac/roles');
    }

    if (!name) {
      req.flash('error', 'Role name is required.');
      return res.redirect('/admin/rbac/roles');
    }

    await role.update({ name, description });
    req.flash('success', 'Role updated.');
  } catch (e) {
    console.error('RBAC POST /roles/:roleId/update error:', e);
    req.flash('error', 'Failed to update role.');
  }
  return res.redirect('/admin/rbac/roles');
});

router.post('/roles/:roleId/delete', async (req, res) => {
  try {
    const roleId = Number(req.params.roleId);

    await UserRole.destroy({ where: { roleId } });
    await RolePermission.destroy({ where: { roleId } });

    const deleted = await Role.destroy({ where: { id: roleId } });
    if (deleted) {
      req.flash('success', 'Role deleted.');
    } else {
      req.flash('error', 'Role not found.');
    }
  } catch (e) {
    console.error('RBAC POST /roles/:roleId/delete error:', e);
    req.flash('error', 'Failed to delete role.');
  }
  return res.redirect('/admin/rbac/roles');
});

router.post('/roles/:roleId/perm', async (req, res) => {
  try {
    const roleId = Number(req.params.roleId);
    const permissionId = Number(req.body.permissionId);
    const action = (req.body.action || '').toLowerCase();

    if (!permissionId || !['add', 'remove'].includes(action)) {
      req.flash('error', 'Invalid permission toggle request.');
      return res.redirect('/admin/rbac/roles');
    }

    const [role, perm] = await Promise.all([
      Role.findByPk(roleId),
      Permission.findByPk(permissionId)
    ]);

    if (!role || !perm) {
      req.flash('error', 'Role or Permission not found.');
      return res.redirect('/admin/rbac/roles');
    }

    if (action === 'add') {
      await RolePermission.findOrCreate({ where: { roleId, permissionId } });
      req.flash('success', `Permission "${perm.code}" added to "${role.name}".`);
    } else {
      await RolePermission.destroy({ where: { roleId, permissionId } });
      req.flash('success', `Permission "${perm.code}" removed from "${role.name}".`);
    }
  } catch (e) {
    console.error('RBAC POST /roles/:roleId/perm error:', e);
    req.flash('error', 'Failed to update permission.');
  }
  return res.redirect('/admin/rbac/roles');
});


router.get('/users', async (req, res, next) => {
  try {
    const users = await User.findAll({
      include: [Role],
      order: [['createdAt', 'DESC']],
      limit: 300
    });
    const roles = await Role.findAll({ order: [['name', 'ASC']] });

    return res.render('admin/rbac/users', {
      title: 'RBAC: User Roles',
      users,
      roles,
      q: '' 
    });
  } catch (e) {
    console.error('RBAC GET /users error:', e);
    return next(e);
  }
});

router.post('/users/:userId/role', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const roleId = Number(req.body.roleId);
    const action = (req.body.action || '').toLowerCase();

    if (!roleId || !['add', 'remove'].includes(action)) {
      req.flash('error', 'Invalid role assignment request.');
      return res.redirect('/admin/rbac/users');
    }

    const [user, role] = await Promise.all([
      User.findByPk(userId),
      Role.findByPk(roleId)
    ]);
    if (!user || !role) {
      req.flash('error', 'User or Role not found.');
      return res.redirect('/admin/rbac/users');
    }

    if (action === 'add') {
      await UserRole.findOrCreate({ where: { userId, roleId } });
      req.flash('success', `Role "${role.name}" assigned to "${user.username}".`);
    } else {
      await UserRole.destroy({ where: { userId, roleId } });
      req.flash('success', `Role "${role.name}" removed from "${user.username}".`);
    }
  } catch (e) {
    console.error('RBAC POST /users/:userId/role error:', e);
    req.flash('error', 'Failed to update user role.');
  }
  return res.redirect('/admin/rbac/users');
});

module.exports = router;