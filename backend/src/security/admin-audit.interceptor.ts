import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AdminAuditService } from './admin-audit.service';
import { requestContext } from './request-context';

const AUDIT_READ_KEY = 'auditRead';

/**
 * Marks a GET on the admin surface as worth recording: one that exposes
 * identity documents or exports data in bulk, or that sends mail. Reads are
 * otherwise left out — the panel polls, and a log of every refresh would bury
 * the changes it exists to show.
 */
export const AuditRead = () => SetMetadata(AUDIT_READ_KEY, true);

/**
 * Records every change made through an admin route, and the reads marked
 * with @AuditRead.
 *
 * Registered globally (security.module.ts) and keyed off `req.admin`, which
 * only AdminAuthGuard sets — so a new admin controller is audited without
 * anyone remembering to add it here, and miner routes are never touched.
 * Guards run before interceptors, so by the time this runs the token has
 * been checked; a request the guard refused is not an admin action.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AdminAuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const admin: { id: string; email: string } | undefined = req?.admin;
    if (!admin) return next.handle();

    const method: string = req.method ?? 'GET';
    const markedRead = this.reflector.get<boolean>(AUDIT_READ_KEY, context.getHandler());
    if (method === 'GET' && !markedRead) return next.handle();

    // The route pattern, not the URL: "/admin/users/:id/airdrop" groups in
    // the log; "/admin/users/cm0abc.../airdrop" would not.
    const route: string = (req.route?.path ?? req.path ?? '').replace(/^\/api/, '');
    const params: Record<string, string> = req.params ?? {};
    const { ip, userAgent } = requestContext(req);
    const base = {
      adminId: admin.id,
      adminEmail: admin.email,
      action: `${method} ${route}`,
      target: params.id ?? params.userId ?? null,
      ip,
      userAgent,
    };
    const input = {
      ...(Object.keys(params).length ? { params } : {}),
      ...(req.query && Object.keys(req.query).length ? { query: req.query } : {}),
      ...(req.body && Object.keys(req.body).length ? { body: req.body } : {}),
    };

    return next.handle().pipe(
      tap({
        next: () => void this.audit.record({ ...base, outcome: 'ok', detail: input }),
        error: (err: unknown) =>
          void this.audit.record({
            ...base,
            outcome: 'error',
            detail: {
              ...input,
              error: {
                status: err instanceof HttpException ? err.getStatus() : 500,
                message: err instanceof Error ? err.message : String(err),
              },
            },
          }),
      }),
    );
  }
}
