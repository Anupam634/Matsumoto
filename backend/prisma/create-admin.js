/**
 * Creates or resets an admin panel login from the command line.
 *
 * Plain JavaScript, and it reads the compiled hash helper, so it runs against
 * a production install where ts-node is not present:
 *
 *   npm run build
 *   npm run admin:create -- admin@example.com 'a-strong-password'
 *
 * Re-running with an existing email resets that admin's password. Role and
 * permissions are only ever touched when you pass them explicitly — a
 * password reset alone never demotes a super admin or revokes a grant.
 *
 * Optional third/fourth args:
 *   npm run admin:create -- finance@example.com 'a-strong-password' admin CRYPTO_PAYMENT_VIEW
 *   npm run admin:create -- owner@example.com   'a-strong-password' super
 *
 * A `super` role holds every permission (see PermissionGuard) regardless of
 * the permissions list, so the fourth argument is only meaningful for a
 * non-super role.
 *
 * On a host with no shell, set ADMIN_EMAIL/ADMIN_PASSWORD (or
 * SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD) instead — the API creates the
 * account at boot. See src/admin/admin-bootstrap.service.ts.
 */
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../dist/auth/password');

const prisma = new PrismaClient();

async function main() {
  const [email, password, role, permissionsArg] = process.argv.slice(2);

  if (!email || !password) {
    throw new Error(
      'Usage: npm run admin:create -- <email> <password> [role] [comma,separated,permissions]',
    );
  }
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters.');
  }

  const passwordHash = await hashPassword(password);
  const permissions = permissionsArg
    ? permissionsArg.split(',').map((p) => p.trim()).filter(Boolean)
    : undefined;

  const data = {
    passwordHash,
    ...(role ? { role } : {}),
    ...(permissions ? { permissions } : {}),
  };

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: data,
    create: { email, ...data },
  });

  console.log(
    `✔ admin ready: ${admin.email} (${admin.id}) role=${admin.role} permissions=[${admin.permissions.join(', ')}]`,
  );
}

main()
  .catch((err) => {
    console.error(`✖ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
