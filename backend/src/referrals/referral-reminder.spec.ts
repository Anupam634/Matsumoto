import {
  ACTIVE_WINDOW_MS,
  NUDGE_COOLDOWN_MS,
  idleDays,
  reminderState,
} from './referral-reminder';

const now = new Date('2026-09-07T12:00:00Z');
const hours = (n: number) => new Date(now.getTime() - n * 3_600_000);

const idle = {
  email: 'miner@example.com',
  isBlocked: false,
  lastMineAt: hours(72),
  lastReferralNudgeAt: null,
};

describe('reminderState', () => {
  it('allows a nudge for an idle, never-nudged referral', () => {
    expect(reminderState(idle, now)).toEqual({
      canSend: true,
      reason: null,
      sentAt: null,
      availableAt: null,
    });
  });

  it('allows a nudge for a referral who has never mined', () => {
    expect(reminderState({ ...idle, lastMineAt: null }, now).canSend).toBe(true);
  });

  it('refuses while the referral is actively mining', () => {
    const active = { ...idle, lastMineAt: new Date(now.getTime() - ACTIVE_WINDOW_MS) };
    expect(reminderState(active, now).reason).toBe('ACTIVE');
    const justIdle = { ...idle, lastMineAt: new Date(now.getTime() - ACTIVE_WINDOW_MS - 1) };
    expect(reminderState(justIdle, now).canSend).toBe(true);
  });

  it('refuses wallet-only accounts with nowhere to send mail', () => {
    expect(reminderState({ ...idle, email: null }, now).reason).toBe('NO_EMAIL');
  });

  it('refuses blocked accounts', () => {
    expect(reminderState({ ...idle, isBlocked: true }, now).reason).toBe('BLOCKED');
  });

  it('enforces the cooldown and reports when it lifts', () => {
    const nudged = { ...idle, lastReferralNudgeAt: hours(1) };
    const state = reminderState(nudged, now);
    expect(state.reason).toBe('COOLDOWN');
    expect(state.sentAt).toBe(hours(1).toISOString());
    expect(state.availableAt).toBe(
      new Date(hours(1).getTime() + NUDGE_COOLDOWN_MS).toISOString(),
    );
  });

  it('allows again once the cooldown has passed', () => {
    const nudged = {
      ...idle,
      lastReferralNudgeAt: new Date(now.getTime() - NUDGE_COOLDOWN_MS - 1),
    };
    const state = reminderState(nudged, now);
    expect(state.canSend).toBe(true);
    expect(state.availableAt).toBeNull();
    expect(state.sentAt).not.toBeNull();
  });

  it('reports ACTIVE ahead of COOLDOWN so the label explains the real block', () => {
    const both = { ...idle, lastMineAt: hours(1), lastReferralNudgeAt: hours(2) };
    expect(reminderState(both, now).reason).toBe('ACTIVE');
  });
});

describe('idleDays', () => {
  it('floors to whole days and never goes negative', () => {
    expect(idleDays(hours(71), now)).toBe(2);
    expect(idleDays(hours(0), now)).toBe(0);
    expect(idleDays(new Date(now.getTime() + 3_600_000), now)).toBe(0);
    expect(idleDays(null, now)).toBeNull();
  });
});
