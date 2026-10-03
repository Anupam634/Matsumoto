import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

export interface JwtPayload {
  sub: string; // user id
  email: string | null;
  /**
   * The account's session version when the token was signed. Absent on
   * tokens issued before session versions existed, which read as 0 — the
   * version every account started at — so those stay valid until the first
   * bump, rather than signing every miner out on deploy.
   */
  sv?: number;
}

export interface RequestUser {
  id: string;
  email: string | null;
}

/**
 * Bearer-token guard. Verifies the JWT, then re-checks the user against the DB
 * so an admin block (SPEC §6) takes effect immediately rather than at token
 * expiry — and so does a session revocation: a password reset, a 2FA change
 * or an operator's "sign out everywhere" bumps the account's session version,
 * and every token signed under the old one stops working on its next request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }
    const token = header.slice('Bearer '.length).trim();

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isBlocked: true, sessionVersion: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists.');
    if (user.isBlocked) throw new ForbiddenException('Account is blocked.');
    if ((payload.sv ?? 0) !== user.sessionVersion) {
      throw new UnauthorizedException('Your session has ended. Please sign in again.');
    }

    req.user = { id: user.id, email: user.email } satisfies RequestUser;
    return true;
  }
}
