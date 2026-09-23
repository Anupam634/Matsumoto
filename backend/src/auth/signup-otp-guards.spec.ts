import { AuthService } from './auth.service';

/**
 * Sign-up mail is only worth sending to someone who got past the guards.
 * The device/IP caps used to run in `register`, after the code had already
 * been mailed, so a scripted caller cost an email on every attempt.
 */
function buildService(overrides: { assertSignupAllowed?: jest.Mock } = {}) {
  const prisma = {
    user: { findUnique: jest.fn(async () => null) },
    $queryRaw: jest.fn(async () => []),
  };
  const emailService = {
    sendOtpEmail: jest.fn(async () => ({ success: true })),
    verifyOtp: jest.fn(async () => true),
  };
  const antiabuse = {
    assertSignupAllowed: overrides.assertSignupAllowed ?? jest.fn(async () => undefined),
    isSelfReferral: jest.fn(async () => false),
    recordDevice: jest.fn(async () => undefined),
  };
  const service = new AuthService(
    prisma as any,
    { signAsync: jest.fn(async () => 'token') } as any,
    antiabuse as any,
    emailService as any,
    { get: jest.fn(() => undefined) } as any,
  );
  return { service, emailService, antiabuse };
}

describe('sendOtp guards for signup', () => {
  const savedSecret = process.env.TURNSTILE_SECRET_KEY;
  const realFetch = global.fetch;

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = savedSecret;
    global.fetch = realFetch;
  });

  it('checks the device/IP caps before mailing anything', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const { service, emailService, antiabuse } = buildService({
      assertSignupAllowed: jest.fn(async () => {
        throw new Error('cap reached');
      }),
    });

    await expect(
      service.sendOtp('new@example.com', 'signup', { ip: '1.2.3.4', fingerprint: 'fp' }),
    ).rejects.toThrow('cap reached');

    expect(antiabuse.assertSignupAllowed).toHaveBeenCalledWith({ ip: '1.2.3.4', fingerprint: 'fp' });
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  it('refuses a website signup with no captcha token, without mailing', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const { service, emailService } = buildService();

    await expect(
      service.sendOtp('new@example.com', 'signup', { platform: 'web' }),
    ).rejects.toThrow(/anti-bot/i);
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  it('mails once the captcha passes', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    global.fetch = jest.fn(async () => ({ json: async () => ({ success: true }) })) as any;
    const { service, emailService } = buildService();

    await expect(
      service.sendOtp('new@example.com', 'signup', { platform: 'web', captchaToken: 'tok' }),
    ).resolves.toEqual({ success: true });
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith('new@example.com', 'signup');
  });

  it('leaves the mobile app alone — it sends no platform and solves no captcha', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const { service, emailService } = buildService();

    await expect(service.sendOtp('new@example.com', 'signup', {})).resolves.toEqual({
      success: true,
    });
    expect(emailService.sendOtpEmail).toHaveBeenCalled();
  });

  it('asks a login resend for a captcha too — it mails a known address', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const { service, emailService } = buildService();
    (service as any).prisma.user.findUnique = jest.fn(async () => ({ isBlocked: false }));

    await expect(
      service.sendOtp('known@example.com', 'login', { platform: 'web' }),
    ).rejects.toThrow(/anti-bot/i);
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();

    global.fetch = jest.fn(async () => ({
      json: async () => ({ success: true, action: 'login' }),
    })) as any;
    await expect(
      service.sendOtp('known@example.com', 'login', { platform: 'web', captchaToken: 'tok' }),
    ).resolves.toEqual({ success: true });
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith('known@example.com', 'login_2fa');
  });
});

describe('login captcha', () => {
  const savedSecret = process.env.TURNSTILE_SECRET_KEY;
  const realFetch = global.fetch;

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = savedSecret;
    global.fetch = realFetch;
  });

  function loginService() {
    const user = {
      id: 'u1',
      email: 'a@b.com',
      passwordHash: null,
      isBlocked: false,
      referralCode: 'C',
    };
    const prisma = { user: { findUnique: jest.fn(async () => user) } };
    const emailService = { sendOtpEmail: jest.fn(async () => ({ success: true })) };
    const service = new AuthService(
      prisma as any,
      { signAsync: jest.fn(async () => 'token') } as any,
      { recordDevice: jest.fn(async () => undefined) } as any,
      emailService as any,
      { get: jest.fn(() => undefined) } as any,
    );
    return { service, prisma, emailService };
  }

  it('is required on the first step, before the password is even checked', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const { service, prisma } = loginService();

    await expect(
      service.login({ email: 'a@b.com', password: 'guess', platform: 'web' } as any, {}),
    ).rejects.toThrow(/anti-bot/i);
    // Refused before the account was even looked up.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('is not asked again on the step that carries the mailed code', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const { service, prisma } = loginService();

    // No captcha token, but an OTP: it gets as far as the password check.
    await expect(
      service.login(
        { email: 'a@b.com', password: 'wrong', otp: '123456', platform: 'web' } as any,
        {},
      ),
    ).rejects.toThrow(/invalid email or password/i);
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });

  it('leaves the mobile app alone', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const { service, prisma } = loginService();

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' } as any, {}),
    ).rejects.toThrow(/invalid email or password/i);
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });
});
