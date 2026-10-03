import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SecuritySettingsService } from './security-settings.service';
import { SecurityEventsService } from './security-events.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

/**
 * Settings, audit trail and per-account security events. Global because
 * anti-abuse, auth, withdrawals and admin all read or write them, and none
 * of those should have to import each other to get at them.
 *
 * Deliberately has no controllers and imports nothing: the admin routes that
 * expose these live in AdminModule, behind AdminAuthGuard, so this module
 * never needs AuthModule — which itself depends on these services.
 */
@Global()
@Module({
  providers: [
    SecuritySettingsService,
    SecurityEventsService,
    AdminAuditService,
    { provide: APP_INTERCEPTOR, useClass: AdminAuditInterceptor },
  ],
  exports: [SecuritySettingsService, SecurityEventsService, AdminAuditService],
})
export class SecurityModule {}
