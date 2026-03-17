// scripts/seed-rbac.js
require('dotenv').config();

const {
  sequelize,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
} = require('../src/models');

async function ensurePermission(code, label) {
  const [perm] = await Permission.findOrCreate({
    where: { code },
    defaults: { code, label: label || code },
  });
  return perm;
}

async function ensureRole(name, description = '') {
  const [role] = await Role.findOrCreate({
    where: { name },
    defaults: { name, description },
  });
  return role;
}

async function grant(role, perm) {
  await RolePermission.findOrCreate({
    where: { roleId: role.id, permissionId: perm.id },
  });
}

async function revokeAll(role) {
  await RolePermission.destroy({ where: { roleId: role.id } });
}

async function upsertSuperuser() {
  // Optional: only if env provided
  const username = process.env.SU_USERNAME;
  const email = process.env.SU_EMAIL;
  const passwordHash = process.env.SU_PASSWORD_HASH; // pre-hashed if you want; otherwise skip
  if (!username || !email) return null;

  const [user] = await User.findOrCreate({
    where: { email },
    defaults: {
      username,
      email,
      passwordHash: passwordHash || '', // set later in UI or via separate script
      role: 'ADMIN',        // legacy field
      isSuperuser: true,    // superuser bypasses RBAC checks
      firstName: 'Super',
      lastName: 'Admin',
    },
  });

  if (passwordHash && user.passwordHash !== passwordHash) {
    user.passwordHash = passwordHash;
    await user.save();
  }
  return user;
}

async function main() {
  console.log('Connecting DB...');
  await sequelize.authenticate();
  // Do NOT sync({force}) here; we assume tables already exist via your app boot.
  console.log('DB OK.');

  // 1) Permissions
  console.log('Ensuring permissions...');
  const pAdminAccess = await ensurePermission('admin.access', 'Access Admin Area');
  const pRepoUpload  = await ensurePermission('repo.upload',  'Upload Repository Items');
  const pAnnCreate   = await ensurePermission('ann.create',   'Create Announcements');
  const pDonExport   = await ensurePermission('don.export',   'Export Donations CSV');

  // 2) Roles
  console.log('Ensuring roles...');
  const rAdmin     = await ensureRole('Ameer', 'Head of MSSN chapter - Full administrative access');
  const rExecutive = await ensureRole('Executive', 'Operational privileges');
  const rMember    = await ensureRole('Member', 'Default member');

  // 3) Assign permissions to roles
  console.log('Assigning permissions to roles...');
  // Admin → all
  await grant(rAdmin, pAdminAccess);
  await grant(rAdmin, pRepoUpload);
  await grant(rAdmin, pAnnCreate);
  await grant(rAdmin, pDonExport);

  // Executive → limited ops
  // (clean slate, then grant specific)
  await revokeAll(rExecutive);
  await grant(rExecutive, pRepoUpload);
  await grant(rExecutive, pAnnCreate);

  // Member → none (clean slate)
  await revokeAll(rMember);

  // 4) Optional: ensure a superuser (bypasses RBAC checks)
  const su = await upsertSuperuser();
  if (su) {
    console.log(`Superuser ensured: ${su.username} <${su.email}> (isSuperuser=${su.isSuperuser})`);
    // Also give Ameer role via UserRole for UI consistency
    await UserRole.findOrCreate({ where: { userId: su.id, roleId: rAdmin.id } });
  }

  console.log('RBAC seed complete ✅');
  await sequelize.close();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});