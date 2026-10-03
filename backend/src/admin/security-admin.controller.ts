import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminAuthGuard, type RequestAdmin } from './admin.guard';
import { AdminService } from './admin.service';
import { UpdateSecuritySettingsDto } from './dto';
import { adminOtpEnforced, adminOtpRecipients, adminSessionTtl } from './admin-session';
import { SecuritySettingsService } from '../security/security-settings.service';
import { AdminAuditService } from '../security/admin-audit.service';
import { maskIdentity } from '../common/mask-identity';

/**
 * The admin panel's Security tab: the settings it can change, the switches
 * it can only show, the audit trail, and the "sign every admin out" button.
 */
@UseGuards(AdminAuthGuard)
@Controller('admin/security')
export class SecurityAdminController {
  constructor(
    private readonly settings: SecuritySettingsService,
    private readonly audit: AdminAuditService,
    private readonly admin: AdminService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /api/admin/security/settings — editable settings with where each
   * value came from, plus the env-only switches, read-only. The latter are
   * kept out of the panel on purpose: a hijacked admin session must not be
   * able to turn off the checks that stop it, or point the admin sign-in
   * code at its own inbox.
   */
  @Get('settings')
  async getSettings(@Req() req: { admin: RequestAdmin }) {
    return {
      settings: await this.settings.view(),
      enforcement: this.enforcement(req.admin.email),
    };
  }

  /** POST /api/admin/security/settings — save overrides; `null` resets one to its env default. */
  @Post('settings')
  async updateSettings(
    @Body() dto: UpdateSecuritySettingsDto,
    @Req() req: { admin: RequestAdmin },
  ) {
    return {
      settings: await this.settings.update(dto, req.admin.email),
      enforcement: this.enforcement(req.admin.email),
    };
  }

  /** GET /api/admin/security/audit?page=&pageSize=&adminEmail=&action= — newest first. */
  @Get('audit')
  auditLog(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('adminEmail') adminEmail?: string,
    @Query('action') action?: string,
  ) {
    return this.audit.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      adminEmail,
      action,
    });
  }

  /**
   * POST /api/admin/security/sessions/revoke-all — every admin, on every
   * device, the caller included, has to sign in again (with the emailed
   * code). For when an admin password may have leaked.
   */
  @Post('sessions/revoke-all')
  revokeAll() {
    return this.admin.revokeAllAdminSessions();
  }

  private enforcement(adminEmail: string) {
    const flag = (name: string) => this.config.get<string>(name) !== 'false';
    return {
      adminLoginCode: adminOtpEnforced(this.config),
      adminLoginCodeSentTo: adminOtpRecipients(this.config, adminEmail).map((email) =>
        maskIdentity({ id: '', email }),
      ),
      adminSessionTtl: adminSessionTtl(this.config),
      userLoginCode: flag('LOGIN_OTP_ENFORCED'),
      withdrawalCode: flag('WITHDRAWAL_OTP_ENFORCED'),
      authenticatorKeyConfigured: !!this.config.get<string>('TOTP_ENCRYPTION_KEY')?.trim(),
    };
  }
}
