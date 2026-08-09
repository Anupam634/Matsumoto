/**
 * Bootstraps an admin panel login. There is deliberately no self-signup for
 * admins, so this script is the only way to create the first one.
 *
 *   npm run admin:create -- admin@example.com 'a-strong-password'
 *
 * Re-running with an existing email resets that admin's password.
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    throw new Error(
      "Usage: npm run admin:create -- <email> <password>",
    );
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
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
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
