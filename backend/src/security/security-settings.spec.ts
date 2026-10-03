import { BadRequestException } from '@nestjs/common';
import { SecuritySettingsService } from './security-settings.service';

/**
 * The bug behind this service: the Security tab showed "Max signups per
 * device" in an input, said "saved", and kept enforcing the env value — so a
 * 1 typed in the panel came back as 3 on the next page load.
 */
function build(env: Record<string, string> = {}) {
  const rows = new Map<string, { key: string; value: string; updatedAt: Date; updatedBy: string | null }>();
  const appSetting = {
    findMany: jest.fn(async () => [...rows.values()]),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const prev = rows.get(where.key);
      rows.set(where.key, {
        ...(prev ?? create),
        ...(prev ? update : {}),
        key: where.key,
        updatedAt: new Date(),
      });
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      rows.delete(where.key);
    }),
  };
  const prisma = {
    appSetting,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const service = new SecuritySettingsService(prisma as any, { get: (k: string) => env[k] } as any);
  return { service, appSetting };
}

describe('SecuritySettingsService', () => {
  it('uses the env values until the panel overrides them', async () => {
    const { service } = build({ MAX_ACCOUNTS_PER_DEVICE: '3', MAX_ACCOUNTS_PER_IP: '5' });

    expect(await service.effective()).toEqual({
      maxAccountsPerDevice: 3,
      maxAccountsPerIp: 5,
      maxAccountsPerSubnet: 0,
      requireTotpForWithdrawal: false,
    });
    const view = await service.view();
    expect(view.maxAccountsPerDevice).toMatchObject({ value: 3, source: 'env' });
    expect(view.maxAccountsPerSubnet).toMatchObject({ value: 0, source: 'default' });
  });

  it('keeps a value saved in the panel — the 1 does not turn back into 3', async () => {
    const { service } = build({ MAX_ACCOUNTS_PER_DEVICE: '3' });

    await service.update({ maxAccountsPerDevice: 1 }, 'ops@example.com');

    expect((await service.effective()).maxAccountsPerDevice).toBe(1);
    expect((await service.view()).maxAccountsPerDevice).toMatchObject({
      value: 1,
      source: 'admin',
      defaultValue: 3,
      updatedBy: 'ops@example.com',
    });
  });

  it('goes back to the env value when the override is reset', async () => {
    const { service } = build({ MAX_ACCOUNTS_PER_DEVICE: '3' });
    await service.update({ maxAccountsPerDevice: 1 }, 'ops@example.com');

    await service.update({ maxAccountsPerDevice: null }, 'ops@example.com');

    expect((await service.view()).maxAccountsPerDevice).toMatchObject({ value: 3, source: 'env' });
  });

  it('rejects an out-of-range or wrong-typed value, and saves nothing from that request', async () => {
    const { service, appSetting } = build();

    await expect(
      service.update({ maxAccountsPerIp: 10, maxAccountsPerDevice: 0 }, 'ops@example.com'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update({ requireTotpForWithdrawal: 'yes' as any }, 'ops@example.com'),
    ).rejects.toThrow(BadRequestException);
    expect(appSetting.upsert).not.toHaveBeenCalled();
  });

  it('ignores a junk env value instead of turning the cap off', async () => {
    // Number('three') is NaN, and `count >= NaN` is always false — the old
    // reading of this variable silently disabled the cap.
    const { service } = build({ MAX_ACCOUNTS_PER_DEVICE: 'three' });
    expect((await service.effective()).maxAccountsPerDevice).toBe(3);
  });

  it('falls back to the env values when the table cannot be read', async () => {
    const { service, appSetting } = build({ MAX_ACCOUNTS_PER_IP: '7' });
    appSetting.findMany.mockRejectedValueOnce(new Error('relation "AppSetting" does not exist'));

    expect((await service.effective()).maxAccountsPerIp).toBe(7);
  });

  it('turns the withdrawal authenticator requirement on and off', async () => {
    const { service } = build();
    await service.update({ requireTotpForWithdrawal: true }, 'ops@example.com');
    expect((await service.effective()).requireTotpForWithdrawal).toBe(true);
  });
});
