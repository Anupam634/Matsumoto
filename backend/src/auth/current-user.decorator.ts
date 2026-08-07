import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from './jwt.guard';

/**
 * Injects the authenticated user attached by JwtAuthGuard.
 * `@CurrentUser('id')` gives just the id.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const user: RequestUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
