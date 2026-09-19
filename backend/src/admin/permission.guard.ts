import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from './permissions';
import type { RequestAdmin } from './admin.guard';

const PERMISSION_KEY = 'requiredPermission';

/** Marks a route as requiring one specific permission beyond a valid admin token. */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);

/**
 * Enforces `@RequirePermission`. Must run after `AdminAuthGuard` (which
 * attaches `req.admin`) — apply both, guard order matters, see
 * FinanceController for the pattern.
 *
 * A `role === 'super'` admin passes every permission check; anyone else
 * needs the permission listed explicitly on `admin.permissions`. This is a
 * backend check on the request itself — it does not depend on, and is not
 * satisfied by, the frontend simply not rendering a link to the route.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<Permission | undefined>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) return true; // route didn't opt in — nothing to enforce

    const req = context.switchToHttp().getRequest();
    const admin: RequestAdmin | undefined = req.admin;
    if (!admin) {
      // AdminAuthGuard should always have run first and set this; treat its
      // absence as "not authorized" rather than trusting an unauthenticated
      // request.
      throw new ForbiddenException('Not authorized.');
    }

    const permissions: string[] = (admin as any).permissions ?? [];
    if (admin.role === 'super' || permissions.includes(required)) {
      return true;
    }

    throw new ForbiddenException(
      `This requires the ${required} permission.`,
    );
  }
}
