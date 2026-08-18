'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface BoosterItem {
  price: number;
  rate: string;
  nameKey: 'starter' | 'power' | 'pro' | 'enterprise';
  boost: string;
  isPopular?: boolean;
  isMax?: boolean;
  powerMeter: number;
}

const BOOSTERS: BoosterItem[] = [
  {
    price: 1,
    rate: '2.9',
    nameKey: 'starter',
    boost: '2.0',
    powerMeter: 35,
  },
  {
    price: 5,
    rate: '10.9',
    nameKey: 'power',
    boost: '10.0',
    powerMeter: 60,
  },
  {
    price: 10,
    rate: '20.9',
    nameKey: 'pro',
    boost: '20.0',
    isPopular: true,
    powerMeter: 80,
  },
  {
    price: 50,
    rate: '90.9',
    nameKey: 'enterprise',
    boost: '90.0',
    isMax: true,
    powerMeter: 100,
  },
];

export function BoosterGrid({ locale }: { locale: string }) {
  const t = useTranslations('landing.boosters');
  const registerLink = `/${locale}/login?mode=register`;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {BOOSTERS.map((b) => (
        <div
          key={b.price}
          className={`glass-panel relative flex flex-col justify-between overflow-hidden p-6 ${
            b.isPopular ? 'border-amber-400/50 shadow-2xl shadow-amber-500/10' : ''
          }`}
        >
          {/* Top highlight badge */}
          {b.isPopular && (
            <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-amber-500 to-yellow-400 px-12 py-1 text-[10px] font-black tracking-widest text-slate-950 shadow-md">
              {t('popularBadge')}
            </div>
          )}
          {b.isMax && (
            <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-purple-500 to-pink-500 px-12 py-1 text-[10px] font-black tracking-widest text-white shadow-md">
              {t('maxYieldBadge')}
            </div>
          )}

          <div>
            {/* Rig Name & Price */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  {t(b.nameKey)}
                </span>
                <div className="mt-1 text-3xl font-black text-amber-400">
                  ${b.price}
                  <span className="text-xs font-medium text-slate-400"> / 30d</span>
                </div>
              </div>

              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-lg">
                ⚡
              </div>
            </div>

            {/* Resulting Rate Box */}
            <div className="my-5 rounded-2xl border border-white/[0.08] bg-slate-950/60 p-4 backdrop-blur-md">
              <div className="text-[11px] uppercase font-semibold text-slate-400">
                {t('resultingRate')}
              </div>
              <div className="mt-1 font-mono text-2xl font-black text-amber-300">
                {b.rate}{' '}
                <span className="text-xs font-medium text-slate-400">BONDKOIN/h</span>
              </div>
              <div className="mt-1 text-[11px] font-bold text-emerald-400">
                {t('hashBoost', { rate: b.boost })}
              </div>
            </div>

            {/* Power meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] uppercase font-semibold text-slate-400">
                <span>Cluster Hashpower</span>
                <span className="font-mono text-amber-400">{b.powerMeter}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-500"
                  style={{ width: `${b.powerMeter}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-4">
            <div className="text-center text-[11px] text-slate-400">
              {t('terms')}
            </div>

            <Link
              href={registerLink}
              className={`mt-3 block w-full rounded-xl py-3 text-center text-xs font-bold uppercase tracking-wider transition-all ${
                b.isPopular
                  ? 'btn-gold shadow-lg shadow-amber-500/20'
                  : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-100 border border-white/[0.1]'
              }`}
            >
              {t('activateButton')}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
