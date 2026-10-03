import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import type { RequestContext } from './request-context';

/**
 * What happened to an account, for the admin panel's "Inspect miner" view.
 *
 * Kept because the last account-takeover could not be reconstructed:
 * DeviceFingerprint holds only the latest IP per device, so a sign-in from a
 * stranger's machine was overwritten by the owner's next visit.
 */
export type SecurityEventType =
  | 'LOGIN_SUCCEEDED'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET'
  | 'TOTP_ENABLED'
  | 'TOTP_DISABLED'
  | 'TOTP_RESET_BY_ADMIN'
  | 'TOTP_FAILED'
  | 'TOTP_LOCKED'
  | 'SESSIONS_REVOKED'
  | 'WITHDRAWAL_REQUESTED';

export interface SecurityEventDto {
  id: string;
  type: string;
  ip: string | null;
  fingerprint: string | null;
  platform: string | null;
  userAgent: string | null;
  detail: unknown;
  createdAt: Date;
}

@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger(SecurityEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Never throws. A security log that fails to write is worth an error line,
   * not a refused sign-in or withdrawal.
   */
  async record(
    userId: string,
    type: SecurityEventType,
    ctx: RequestContext = {},
    detail?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.userSecurityEvent.create({
        data: {
          userId,
          type,
          ip: ctx.ip ?? null,
          fingerprint: ctx.fingerprint?.slice(0, 128) ?? null,
          platform: ctx.platform ?? null,
          userAgent: ctx.userAgent ?? null,
          detail: (detail ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.error(
        `[SECURITY EVENT NOT RECORDED] user=${userId} type=${type}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async listForUser(userId: string, take = 50): Promise<SecurityEventDto[]> {
    return this.prisma.userSecurityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        type: true,
        ip: true,
        fingerprint: true,
        platform: true,
        userAgent: true,
        detail: true,
        createdAt: true,
      },
    });
  }
}
