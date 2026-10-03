import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type AuditOutcome = 'ok' | 'error' | 'denied';

export interface AuditEntry {
  adminId?: string | null;
  adminEmail: string;
  action: string;
  target?: string | null;
  outcome: AuditOutcome;
  detail?: unknown;
  ip?: string;
  userAgent?: string;
}

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  /** Exact admin email. */
  adminEmail?: string;
  /** Prefix of the action, e.g. "ADMIN_LOGIN" or "POST /admin/users". */
  action?: string;
}

const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/** Field names whose values are credentials and never belong in a log. */
const SECRET_KEY = /pass(word)?|otp|totp|^code$|token|secret|captcha/i;
const MAX_STRING = 300;
const MAX_ITEMS = 20;
const MAX_DEPTH = 4;

/**
 * Copy of a request body or query that is safe to keep forever: credentials
 * replaced, long strings cut, deep or wide structures trimmed. A task edit
 * can carry a whole quiz; the log needs to show that it changed, not all of it.
 */
export function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}… (${value.length} chars)` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (depth >= MAX_DEPTH) return '[…]';
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ITEMS).map((v) => sanitizeForAudit(v, depth + 1));
    if (value.length > MAX_ITEMS) items.push(`… ${value.length - MAX_ITEMS} more`);
    return items;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY.test(key) ? '[redacted]' : sanitizeForAudit(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

/**
 * The admin audit trail: who signed in to the admin panel, from where, and
 * every change they made through it. Written by AdminService for sign-in and
 * by AdminAuditInterceptor for everything else.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Never throws: a failed audit write is logged, not turned into a failed action. */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminId: entry.adminId ?? null,
          adminEmail: entry.adminEmail.slice(0, 254),
          action: entry.action.slice(0, 200),
          target: entry.target?.slice(0, 200) ?? null,
          outcome: entry.outcome,
          detail:
            entry.detail === undefined
              ? undefined
              : (sanitizeForAudit(entry.detail) as Prisma.InputJsonValue),
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `[ADMIN AUDIT NOT RECORDED] ${entry.adminEmail} ${entry.action} (${entry.outcome}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async list(query: AuditQuery = {}) {
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.trunc(query.pageSize ?? PAGE_SIZE) || PAGE_SIZE),
    );
    const page = Math.max(1, Math.trunc(query.page ?? 1) || 1);
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(query.adminEmail?.trim() ? { adminEmail: query.adminEmail.trim() } : {}),
      ...(query.action?.trim() ? { action: { startsWith: query.action.trim() } } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, rows };
  }
}
