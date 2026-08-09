import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

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
}

export interface RequestAdmin {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
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
      select: { id: true, email: true, role: true },
    });
    if (!admin) throw new UnauthorizedException('Admin no longer exists.');

    req.admin = admin satisfies RequestAdmin;
    return true;
  }
}
