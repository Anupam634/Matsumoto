import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { canonicalizeEmail } from '../common/canonical-email';

/**
 * Guards the duplicate-mailbox fix: an account registered as `xyz@gmail.com`
 * must stop `xy.z@gmail.com` from being mailed a code and from registering.
 *
 * `$queryRaw` stands in for the canonical sweep, folding with the same rule
 * the SQL is written to, so what these tests pin is the *decision* the
 * service makes once the sweep answers. The SQL string itself is NOT covered
 * here — it needs a real Postgres to execute — so treat a green run as proof
 * of the branching, not of the query.
 */
function buildService(registered: string[]) {
  const rows = registered.map((email, i) => ({
    id: `u${i}`,
    email: email.trim().toLowerCase(),
    isBlocked: false,
  }));

  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.email !== undefined) {
          return rows.find((r) => r.email === where.email) ?? null;
        }
        return null;
      }),
      create: jest.fn(async (_args: any) => ({
        id: 'new',
        email: 'new@gmail.com',
        referralCode: 'CODE',
      })),
    },
    $queryRaw: jest.fn(async (_strings: any, canonicalLocal: string) => {
      const hit = rows.find((r) => {
        const { canonicalLocal: local, aliases } = canonicalizeEmail(r.email);
        return aliases && local === canonicalLocal;
      });
      return hit ? [hit] : [];
    }),
  };

  const emailService = {
    sendOtpEmail: jest.fn(async () => ({ success: true })),
    verifyOtp: jest.fn(async () => true),
  };
  const antiabuse = {
    assertSignupAllowed: jest.fn(async () => undefined),
    isSelfReferral: jest.fn(async () => false),
    recordDevice: jest.fn(async () => undefined),
  };
  const jwt = { signAsync: jest.fn(async () => 'token') };

  const service = new AuthService(
    prisma as any,
    jwt as any,
    antiabuse as any,
    emailService as any,
  );
  return { service, prisma, emailService };
}

const registerDto = (email: string) =>
  ({ email, password: 'Sup3rSecret!', otp: '123456' }) as any;

describe('signup against a mailbox that is already registered', () => {
  describe('sendOtp', () => {
    it('refuses the exact address, as it always did', async () => {
      const { service, emailService } = buildService(['xyz@gmail.com']);
      await expect(service.sendOtp('xyz@gmail.com', 'signup')).rejects.toThrow(
        BadRequestException,
      );
      expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
    });

    it('refuses a dotted gmail variant and sends no code', async () => {
      const { service, emailService } = buildService(['xyz@gmail.com']);
      await expect(service.sendOtp('xy.z@gmail.com', 'signup')).rejects.toThrow(
        /already registered as xyz@gmail\.com/,
      );
      expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
    });

    it('refuses a +tag and a googlemail variant too', async () => {
      for (const alias of [
        'xyz+spare@gmail.com',
        'x.y.z@googlemail.com',
        'X.Y.Z+work@GoogleMail.com',
      ]) {
        const { service, emailService } = buildService(['xyz@gmail.com']);
        await expect(service.sendOtp(alias, 'signup')).rejects.toThrow(
          BadRequestException,
        );
        expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
      }
    });

    it('still sends a code to a genuinely new address', async () => {
      const { service, emailService } = buildService(['xyz@gmail.com']);
      await expect(
        service.sendOtp('someone.else@gmail.com', 'signup'),
      ).resolves.toEqual({ success: true });
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
        'someone.else@gmail.com',
        'signup',
      );
    });

    it('does not fold dots on non-aliasing domains', async () => {
      // xy.z@outlook.com is a different mailbox from xyz@outlook.com.
      const { service, emailService } = buildService(['xyz@outlook.com']);
      await expect(
        service.sendOtp('xy.z@outlook.com', 'signup'),
      ).resolves.toEqual({ success: true });
      expect(emailService.sendOtpEmail).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const signals = { ip: '1.2.3.4', fingerprint: 'fp' };

    it('refuses a dotted gmail variant even with a valid OTP', async () => {
      const { service, prisma } = buildService(['xyz@gmail.com']);
      await expect(
        service.register(registerDto('xy.z@gmail.com'), signals),
      ).rejects.toThrow(/already registered as xyz@gmail\.com/);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('refuses the reverse direction — plain form against a dotted account', async () => {
      const { service, prisma } = buildService(['x.y.z@gmail.com']);
      await expect(
        service.register(registerDto('xyz@gmail.com'), signals),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('still registers a genuinely new mailbox', async () => {
      const { service, prisma } = buildService(['xyz@gmail.com']);
      const result = await service.register(
        registerDto('brand.new@gmail.com'),
        signals,
      );
      expect(result.accessToken).toBe('token');
      expect(prisma.user.create).toHaveBeenCalled();
      // Stored as typed (lowercased) — the fold is for comparison only.
      expect(prisma.user.create.mock.calls[0][0].data.email).toBe(
        'brand.new@gmail.com',
      );
    });

    it('skips the canonical sweep entirely for non-aliasing domains', async () => {
      const { service, prisma } = buildService(['xyz@outlook.com']);
      await service.register(registerDto('xy.z@outlook.com'), signals);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
