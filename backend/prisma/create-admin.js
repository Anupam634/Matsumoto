/**
 * Creates or resets an admin panel login from the command line.
 *
 * Plain JavaScript, and it reads the compiled hash helper, so it runs against
 * a production install where ts-node is not present:
 *
 *   npm run build
 *   npm run admin:create -- admin@example.com 'a-strong-password'
 *
 * Re-running with an existing email resets that admin's password.
 *
 * On a host with no shell, set ADMIN_EMAIL and ADMIN_PASSWORD instead — the
 * API creates the account at boot. See src/admin/admin-bootstrap.service.ts.
 */
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../dist/auth/password');

const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    throw new Error('Usage: npm run admin:create -- <email> <password>');
  }
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters.');
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`✔ admin ready: ${admin.email} (${admin.id})`);
}

main()
  .catch((err) => {
    console.error(`✖ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
