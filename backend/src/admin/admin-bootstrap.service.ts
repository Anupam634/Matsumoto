import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { hashPassword } from '../auth/password';

/** Refuse to stand up an operator account behind a trivial password. */
const MIN_PASSWORD_LENGTH = 12;

/**
 * Creates the first admin login from environment variables at boot.
 *
 * There is deliberately no admin self-signup, and the create-admin script
 * needs a shell — which the free tier of most hosts does not provide. Without
 * this, a fresh deployment has no way to reach its own admin panel.
 *
 * ADMIN_PASSWORD is the source of truth: the account is upserted on every
 * boot, so a forgotten password is recovered by changing the variable and
 * redeploying rather than by getting shell access to the database.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim();
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      // Nothing configured is a normal state — an admin may already exist.
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      this.logger.error(
        `ADMIN_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters — refusing to create an admin. The API is otherwise unaffected.`,
      );
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      const existing = await this.prisma.adminUser.findUnique({
        where: { email },
        select: { id: true },
      });

      await this.prisma.adminUser.upsert({
        where: { email },
        update: { passwordHash },
        create: { email, passwordHash },
      });

      this.logger.log(
        existing
          ? `Admin ${email} password synced from ADMIN_PASSWORD.`
          : `Admin ${email} created from environment.`,
      );
    } catch (err) {
      // A missing table means migrations have not run yet; that is worth
      // saying plainly rather than crashing the whole API on boot.
      this.logger.error(
        `Could not bootstrap the admin account: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
