import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { adminOtpEnforced } from './admin-session';

/**
 * Admin tokens carry `typ: 'admin'`. Miner tokens (issued by AuthService)
 * carry no `typ`, so this guard rejects them outright — a normal user token
 * can never reach an admin route even though both are signed with the same
 * JWT_SECRET.
 */
export interface AdminJwtPayload {
  sub: string; // AdminUser id
  email: string;
  typ: 'admin';
  /** AdminUser.sessionVersion at sign-in. Required — see the guard. */
  sv?: number;
  /** True when the emailed sign-in code was checked for this token. */
  mfa?: boolean;
}

export interface RequestAdmin {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    let payload: AdminJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<AdminJwtPayload>(
        header.slice('Bearer '.length).trim(),
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (payload.typ !== 'admin') {
      throw new UnauthorizedException('Not an admin token.');
    }

    // Re-check against the DB so a deleted admin loses access immediately
    // rather than at token expiry.
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, permissions: true, sessionVersion: true },
    });
    if (!admin) throw new UnauthorizedException('Admin no longer exists.');

    // A token must name the session version it was issued under. Unlike
    // miner tokens, a missing claim is not read as 0: every admin token from
    // before this check was issued on the password alone, and none of them
    // should survive it. Changing the password or pressing "sign out every
    // admin session" bumps the version and ends the rest the same way.
    if (typeof payload.sv !== 'number' || payload.sv !== admin.sessionVersion) {
      throw new UnauthorizedException('Your admin session has ended. Please sign in again.');
    }
    if (adminOtpEnforced(this.config) && payload.mfa !== true) {
      throw new UnauthorizedException('Sign in again — the admin console now needs the emailed code.');
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    } satisfies RequestAdmin;
    return true;
  }
}
