import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { hashPassword } from '../auth/password';

/** Refuse to stand up an operator account behind a trivial password. */
const MIN_PASSWORD_LENGTH = 12;

/**
 * Creates admin logins from environment variables at boot.
 *
 * There is deliberately no admin self-signup, and the create-admin script
 * needs a shell — which the free tier of most hosts does not provide. Without
 * this, a fresh deployment has no way to reach its own admin panel.
 *
 * `*_PASSWORD` is the source of truth: each account is upserted on every
 * boot, so a forgotten password is recovered by changing the variable and
 * redeploying rather than by getting shell access to the database.
 *
 * Two accounts can be bootstrapped this way:
 *  - ADMIN_EMAIL/ADMIN_PASSWORD — the general admin (unchanged from before).
 *  - SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD — a `role: 'super'` account,
 *    which PermissionGuard treats as holding every permission (including
 *    CRYPTO_PAYMENT_VIEW) regardless of the `permissions` column. This is
 *    the one place a super admin can be stood up without shell/DB access.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.bootstrapOne({
      emailVar: 'ADMIN_EMAIL',
      passwordVar: 'ADMIN_PASSWORD',
      role: null, // leave the schema default / whatever role the row already has
      kind: 'Admin',
    });
    await this.bootstrapOne({
      emailVar: 'SUPER_ADMIN_EMAIL',
      passwordVar: 'SUPER_ADMIN_PASSWORD',
      role: 'super',
      kind: 'Super admin',
    });
  }

  private async bootstrapOne(opts: {
    emailVar: string;
    passwordVar: string;
    /** null: don't touch role (used for the general ADMIN_* pair, which
     *  predates roles entirely and must not silently demote a promoted
     *  account back to "admin" on every boot). */
    role: string | null;
    kind: string;
  }) {
    const email = this.config.get<string>(opts.emailVar)?.trim();
    const password = this.config.get<string>(opts.passwordVar);

    if (!email || !password) {
      // Nothing configured is a normal state — the account may already exist.
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      this.logger.error(
        `${opts.passwordVar} is shorter than ${MIN_PASSWORD_LENGTH} characters — refusing to create ${opts.kind}. The API is otherwise unaffected.`,
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
        update: opts.role ? { passwordHash, role: opts.role } : { passwordHash },
        create: opts.role
          ? { email, passwordHash, role: opts.role }
          : { email, passwordHash },
      });

      this.logger.log(
        existing
          ? `${opts.kind} ${email} synced from ${opts.passwordVar}.`
          : `${opts.kind} ${email} created from environment.`,
      );
    } catch (err) {
      // A missing table means migrations have not run yet; that is worth
      // saying plainly rather than crashing the whole API on boot.
      this.logger.error(
        `Could not bootstrap ${opts.kind}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
