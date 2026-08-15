'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface BoosterOpt {
  id: string;
  nameKey: 'starter' | 'power' | 'pro' | 'enterprise';
  price: number;
  rate: number;
}

const BOOSTER_OPTIONS: BoosterOpt[] = [
  { id: 'free', nameKey: 'starter', price: 0, rate: 0.9 },
  { id: 'b1', nameKey: 'starter', price: 1, rate: 2.9 },
  { id: 'b5', nameKey: 'power', price: 5, rate: 10.9 },
  { id: 'b10', nameKey: 'pro', price: 10, rate: 20.9 },
  { id: 'b50', nameKey: 'enterprise', price: 50, rate: 90.9 },
];

function getMultiplier(invites: number): { level: number; mult: number } {
  if (invites >= 31) return { level: 6, mult: 8 };
  if (invites >= 21) return { level: 5, mult: 6 };
  if (invites >= 11) return { level: 4, mult: 5 };
  if (invites >= 6) return { level: 3, mult: 4 };
  if (invites >= 1) return { level: 2, mult: 3 };
  return { level: 1, mult: 1 };
}

export function MiningCalculator({ locale }: { locale: string }) {
  const t = useTranslations('landing.calculator');

  const [selectedBooster, setSelectedBooster] = useState<BoosterOpt>(
    BOOSTER_OPTIONS[3]
  );
  const [inviteCount, setInviteCount] = useState<number>(12);

  const tier = getMultiplier(inviteCount);
  const effectiveRate = +(selectedBooster.rate * tier.mult).toFixed(1);
  const dailyPoints = +(effectiveRate * 24).toFixed(1);
  const monthlyPoints = +(dailyPoints * 30).toFixed(0);
  const monthlyTokens = +(monthlyPoints / 3).toFixed(0);

  const registerLink = `/${locale}/login?mode=register`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/40 p-6 sm:p-12 shadow-2xl backdrop-blur-2xl">
      {/* Ambient background cones */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Left column: Interactive Controls */}
        <div className="space-y-6 lg:col-span-7">
          <div>
            <label className="block text-xs uppercase font-extrabold tracking-wider text-amber-400">
              {t('selectBooster')}
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {BOOSTER_OPTIONS.map((b) => {
                const isSelected = selectedBooster.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBooster(b)}
                    className={`rounded-2xl border p-3 text-center transition-all duration-200 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 shadow-xl shadow-amber-500/10 scale-105'
                        : 'border-white/[0.06] bg-slate-950/60 hover:border-white/20 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200">
                      {b.price === 0 ? 'Free Base' : `$${b.price}`}
                    </div>
                    <div
                      className={`mt-1 font-mono text-sm font-extrabold ${
                        isSelected ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {b.rate} /h
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Referral slider */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                {t('selectInvites')}
              </label>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-mono font-bold text-amber-300">
                {inviteCount} Invited (L{tier.level} • ×{tier.mult})
              </span>
            </div>

            <div className="mt-4">
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={inviteCount}
                onChange={(e) => setInviteCount(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-500"
              />
              <div className="mt-2 flex justify-between text-[11px] font-mono text-slate-500">
                <span>0 (×1)</span>
                <span>5 (×3)</span>
                <span>10 (×4)</span>
                <span>20 (×5)</span>
                <span>30 (×6)</span>
                <span>31+ (×8)</span>
              </div>
            </div>
          </div>

          {/* Real math breakdown note */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-4 text-xs text-slate-300 backdrop-blur-md">
            <span className="text-amber-400 font-bold">Reward Calculation Engine:</span>{' '}
            {selectedBooster.rate} MATSU/h × ×{tier.mult} (Level {tier.level} Multiplier) ={' '}
            <span className="font-mono text-amber-300 font-extrabold">{effectiveRate} MATSU/h</span>
          </div>
        </div>

        {/* Right column: Results Output Card */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-amber-950/20 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
            <div className="text-xs uppercase font-extrabold tracking-wider text-amber-400/90">
              {t('estimatedYield')}
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-sm text-slate-400">{t('hourlyRate')}</span>
                <span className="font-mono text-lg font-extrabold text-amber-300">
                  {effectiveRate} MATSU/h
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-sm text-slate-400">{t('dailyYield')}</span>
                <span className="font-mono text-lg font-extrabold text-slate-200">
                  {dailyPoints} PTS
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-sm text-slate-400">{t('monthlyYield')}</span>
                <span className="font-mono text-xl font-black text-amber-400">
                  {monthlyPoints.toLocaleString()} PTS
                </span>
              </div>

              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-center">
                <div className="text-xs uppercase font-bold text-amber-300">
                  {t('onChainPayout')}
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-amber-400 sm:text-3xl">
                  ~{monthlyTokens.toLocaleString()} $MATSU
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Direct BEP-20 transfer to your BNB Chain address
                </div>
              </div>
            </div>

            <Link
              href={registerLink}
              className="btn-gold mt-6 block w-full rounded-2xl py-3.5 text-center text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-xl"
            >
              {t('cta')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
