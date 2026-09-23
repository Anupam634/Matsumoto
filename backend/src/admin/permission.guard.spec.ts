import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard, RequirePermission } from './permission.guard';
import { PERMISSIONS } from './permissions';

function contextFor(admin: any, handler: (...a: any[]) => any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ admin }) }),
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

// A "route" is just a function carrying the metadata @RequirePermission set.
class FakeController {
  @RequirePermission(PERMISSIONS.CRYPTO_PAYMENT_VIEW)
  guardedRoute() {}

  unguardedRoute() {}
}

describe('PermissionGuard', () => {
  const guard = new PermissionGuard(new Reflector());
  const controller = new FakeController();

  it('rejects a general admin without the permission (unauthorized admin access)', () => {
    const admin = { id: '1', email: 'admin@x.com', role: 'admin', permissions: [] };
    expect(() =>
      guard.canActivate(contextFor(admin, controller.guardedRoute)),
    ).toThrow(ForbiddenException);
  });

  it('rejects when there is no admin on the request at all', () => {
    expect(() =>
      guard.canActivate(contextFor(undefined, controller.guardedRoute)),
    ).toThrow(ForbiddenException);
  });

  it('allows an admin explicitly granted the permission (authorized finance-admin access)', () => {
    const admin = {
      id: '2',
      email: 'finance@x.com',
      role: 'admin',
      permissions: [PERMISSIONS.CRYPTO_PAYMENT_VIEW],
    };
    expect(guard.canActivate(contextFor(admin, controller.guardedRoute))).toBe(true);
  });

  it('allows a super admin regardless of their permissions list', () => {
    const admin = { id: '3', email: 'super@x.com', role: 'super', permissions: [] };
    expect(guard.canActivate(contextFor(admin, controller.guardedRoute))).toBe(true);
  });

  it('lets a general admin through a route that requires no permission', () => {
    const admin = { id: '1', email: 'admin@x.com', role: 'admin', permissions: [] };
    expect(guard.canActivate(contextFor(admin, controller.unguardedRoute))).toBe(true);
  });
});
