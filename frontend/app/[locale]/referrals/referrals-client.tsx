'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  getReferralStats,
  ReferralStatsResponse,
  ReferralMember,
  getToken,
  ApiError,
} from '../../../lib/api';
import { AppHeader } from '../../../components/AppHeader';
import { MobileTabBar } from '../../../components/MobileTabBar';

export default function ReferralsClient({ locale }: { locale: string }) {
  const t = useTranslations('referrals');
  const tDashboard = useTranslations('dashboard');
  const router = useRouter();

  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Search & Filter for Team Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'IDLE'>('ALL');

  // Interactive Calculator Slider
  const [calcInvites, setCalcInvites] = useState(5);
  const [calcBaseRate, setCalcBaseRate] = useState(0.9);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${locale}/login`);
      return;
    }
    loadData();
  }, [locale, router]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await getReferralStats();
      setStats(data);
      if (data.totalInvited > 0) {
        setCalcInvites(Math.max(data.totalInvited, 5));
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to load referral network.');
    } finally {
      setLoading(false);
    }
  }

  const referralCode = stats?.referralCode || '';
  const domain = typeof window !== 'undefined' ? window.location.origin : 'https://bondkoinlabs.com';
  const referralLink = `${domain}/${locale}/login?ref=${referralCode}&mode=register`;

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join my BONDKOIN Mining Node!',
          text: `Mine $BONDKOIN for free on BNB Chain with zero battery drain! Use my referral code: ${referralCode}`,
          url: referralLink,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      copyToClipboard(referralLink, 'link');
    }
  };

  // Calculator Multiplier Helper
  const getSimulatedMultiplier = (invites: number) => {
    if (invites >= 31) return 8;
    if (invites >= 21) return 6;
    if (invites >= 11) return 5;
    if (invites >= 6) return 4;
    if (invites >= 1) return 3;
    return 1;
  };

  const simMultiplier = getSimulatedMultiplier(calcInvites);
  const simEffectiveRate = calcBaseRate * simMultiplier;
  const simDailyPoints = simEffectiveRate * 24;
  const simMonthlyBondkoin = (simDailyPoints * 30) / 3; // 3 PTS = 1 BONDKOIN

  // Filter roster
  const filteredRoster = (stats?.referralsList || []).filter((m) => {
    if (filterStatus === 'ACTIVE' && !m.isMiningActive) return false;
    if (filterStatus === 'IDLE' && m.isMiningActive) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return m.maskedEmail.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="glow-field min-h-screen bg-cyber-grid bg-slate-950 pb-28 text-slate-100">
      <AppHeader locale={locale} backLabel={t('back')} maxWidth="max-w-5xl" />

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 space-y-6">
        {/* ───────────────── 3D Hero Banner with Node Matrix ───────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900/90 via-[#131622] to-slate-950 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Animated 3D Node Mesh Lighting Background */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl" />

          <div className="relative z-10 grid items-center gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
                <span>BONDKOIN Node Affiliate Network</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                {t('title')}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                {t('subtitle')}
              </p>

              {/* Quick Share Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <span>🚀</span>
                  <span>{t('share')}</span>
                </button>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Mine free $BONDKOIN on BNB Chain! Zero battery drain.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-xs font-bold text-sky-300 hover:bg-sky-500/20 transition-all"
                  >
                    <span>✈️</span>
                    <span className="truncate">{t('shareTelegram')}</span>
                  </a>

                  <a
                    href={`https://x.com/intent/post?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("I'm mining $BONDKOIN every day on BNB Chain with @BondKoin ⛏️ Free to join, no hardware, on-chain payouts. Start with my link 👇")}&hashtags=BONDKOIN,BNBChain,Crypto,Mining`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-all"
                  >
                    <span>𝕏</span>
                    <span className="truncate">{t('shareTwitter')}</span>
                  </a>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my BONDKOIN Mining Node! ${referralLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"
                  >
                    <span>💬</span>
                    <span className="truncate">{t('shareWhatsApp')}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-800/80 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all"
                  >
                    <span>📱</span>
                    <span className="truncate">{t('qrCode')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3D Holographic Referral Link Card */}
            <div className="lg:col-span-5">
              <div className="card relative overflow-hidden rounded-2xl border-amber-500/40 bg-slate-950/90 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t('code')}
                  </span>
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 shrink-0">
                    Active Node Key
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 overflow-hidden">
                  <span className="font-mono text-xs sm:text-sm font-black text-amber-300 truncate select-all flex-1 min-w-0">
                    {referralCode || '...'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(referralCode, 'code')}
                    className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all active:scale-95"
                  >
                    {copiedCode ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    {t('yourLink')}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="input-field w-full py-2.5 px-3 text-xs font-mono text-slate-300 truncate select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(referralLink, 'link')}
                      className="w-full sm:w-auto shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2.5 text-xs font-black uppercase text-slate-950 shadow-md hover:scale-[1.02] transition-all text-center"
                    >
                      {copiedLink ? '✓ Copied' : t('copyLink')}
                    </button>
                  </div>
                </div>

                {/* QR Code Expansion */}
                {showQr && (
                  <div className="mt-2 flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 p-4 animate-in fade-in zoom-in-95">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(referralLink)}`}
                      alt="Referral QR Code"
                      width={140}
                      height={140}
                      className="rounded-xl bg-white p-2 shadow-md"
                    />
                    <p className="text-[11px] text-slate-400 text-center font-medium">
                      {t('scanToJoin')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── Real-Time Network HUD ───────────────── */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="card rounded-2xl border-slate-800 bg-slate-900/80 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl">👥</span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-400">
                Tier 1
              </span>
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-black text-white">
              {stats?.totalInvited ?? 0}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              {t('totalInvited')}
            </div>
          </div>

          <div className="card rounded-2xl border-slate-800 bg-slate-900/80 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl">⚡</span>
              <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-black text-emerald-400">
              {stats?.activeMinersCount ?? 0}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              {t('activeMiners')}
            </div>
          </div>

          <div className="card rounded-2xl border-slate-800 bg-slate-900/80 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl">🔥</span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                Rank Boost
              </span>
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-black text-amber-400">
              {stats?.currentTier.multiplier ?? 1}×
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              {t('multiplier')}
            </div>
          </div>

          <div className="card rounded-2xl border-slate-800 bg-slate-900/80 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl">👑</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-300">
                Level {stats?.currentTier.level ?? 1}
              </span>
            </div>
            <div className="mt-3 text-lg sm:text-xl font-black text-white truncate">
              {stats?.currentTier.level === 6
                ? 'Cyber Sovereign'
                : stats?.currentTier.level === 5
                ? 'Platinum Syndicate'
                : stats?.currentTier.level === 4
                ? 'Gold Master'
                : stats?.currentTier.level === 3
                ? 'Silver Leader'
                : stats?.currentTier.level === 2
                ? 'Bronze Scout'
                : 'Free Miner'}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              {t('currentTier')}
            </div>
          </div>
        </section>

        {/* ───────────────── 3D Tier Multiplier Roadmap ───────────────── */}
        <section className="card rounded-3xl border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                🧬 {t('tierProgression')}
              </h2>
              <p className="text-xs text-slate-400">
                Invited miners multiply your entire base rate and booster power up to 8×!
              </p>
            </div>

            {stats?.nextTier && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3.5 py-1.5 font-mono text-xs font-bold text-amber-300">
                {t('invitesNeeded', {
                  count: stats.invitesNeededForNext,
                  level: stats.nextTier.level,
                  multiplier: stats.nextTier.multiplier,
                })}
              </div>
            )}
          </div>

          {/* Progress Bar to next tier */}
          {stats?.nextTier && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">
                  Level {stats.currentTier.level} ({stats.currentTier.multiplier}×)
                </span>
                <span className="text-amber-400">
                  {stats.progressToNextPercent}% Completed
                </span>
                <span className="text-slate-400">
                  Level {stats.nextTier.level} ({stats.nextTier.multiplier}×)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-white/10 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-700 shadow-md shadow-amber-500/30"
                  style={{ width: `${stats.progressToNextPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* 6 Tiers Grid Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(stats?.allTiers || []).map((tier) => {
              const isCurrent = stats?.currentTier.level === tier.level;
              const isUnlocked = (stats?.currentTier.level ?? 1) >= tier.level;

              const title =
                tier.level === 6
                  ? 'Cyber Sovereign'
                  : tier.level === 5
                  ? 'Platinum Syndicate'
                  : tier.level === 4
                  ? 'Gold Master'
                  : tier.level === 3
                  ? 'Silver Leader'
                  : tier.level === 2
                  ? 'Bronze Scout'
                  : 'Free Miner';

              return (
                <div
                  key={tier.level}
                  className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all ${
                    isCurrent
                      ? 'border-2 border-amber-500 bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 shadow-xl shadow-amber-500/10'
                      : isUnlocked
                      ? 'border border-emerald-500/30 bg-slate-950/70'
                      : 'border border-white/5 bg-slate-950/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      Tier {tier.level}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isCurrent ? 'Current Rank' : isUnlocked ? t('unlocked') : t('locked')}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-black text-white">{title}</h3>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-black text-amber-400">
                      {tier.multiplier}×
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      Hashrate Multiplier
                    </span>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-2.5 text-xs text-slate-400 flex items-center justify-between font-mono">
                    <span>Required:</span>
                    <strong className="text-white">
                      {tier.minInvites === 0
                        ? '0 Invites'
                        : tier.maxInvites >= 2000
                        ? '31+ Invites'
                        : `${tier.minInvites}–${tier.maxInvites} Invites`}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ───────────────── Interactive Multiplier Calculator ───────────────── */}
        <section className="card rounded-3xl border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              🧮 {t('calculatorTitle')}
            </h2>
            <p className="text-xs text-slate-400">
              {t('calculatorSubtitle')}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-300">Invite Count Slider:</span>
                  <span className="font-mono text-amber-400 text-sm font-black">
                    {calcInvites} Invited Miners
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={calcInvites}
                  onChange={(e) => setCalcInvites(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>0 (1×)</span>
                  <span>5 (3×)</span>
                  <span>10 (4×)</span>
                  <span>20 (5×)</span>
                  <span>30 (6×)</span>
                  <span>31+ (8× Max)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-300">{t('baseRateLabel')}:</span>
                  <span className="font-mono text-cyan-300 text-xs">
                    {calcBaseRate.toFixed(2)} BONDKOIN/h
                  </span>
                </div>
                <div className="flex gap-2">
                  {[0.9, 2.9, 5.9, 12.9, 65.9].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setCalcBaseRate(rate)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                        calcBaseRate === rate
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'border border-white/10 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {rate === 0.9 ? 'Base' : `+${(rate - 0.9).toFixed(0)} Boost`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-amber-500/30 bg-slate-950 p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Achieved Multiplier:</span>
                  <span className="font-mono text-base font-black text-amber-400">
                    {simMultiplier}× Boost
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-white/10 pt-3">
                  <span className="text-slate-400">{t('projectedSpeed')}:</span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    {simEffectiveRate.toFixed(2)} /h
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-white/10 pt-3">
                  <span className="text-slate-400">{t('dailyPts')}:</span>
                  <span className="font-mono text-base font-black text-white">
                    {simDailyPoints.toFixed(1)} PTS / day
                  </span>
                </div>

                <div className="rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-emerald-500/15 p-3.5 border border-amber-500/30 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-300">
                    {t('monthlyTokens')}
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black text-white">
                    ~{simMonthlyBondkoin.toFixed(0)} $BONDKOIN
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    (Direct withdrawal to BNB Chain wallet)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── Invited Miners Team Roster ───────────────── */}
        <section className="card rounded-3xl border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                👥 {t('teamRoster')} ({stats?.totalInvited ?? 0})
              </h2>
              <p className="text-xs text-slate-400">
                Track your invited miners and their live mining status.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-slate-950 p-1 text-xs font-semibold border border-white/10">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    filterStatus === 'ALL'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({stats?.totalInvited ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('ACTIVE')}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    filterStatus === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mining 🟢 ({stats?.activeMinersCount ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('IDLE')}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    filterStatus === 'IDLE'
                      ? 'bg-slate-800 text-slate-200 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Idle ⚪ ({(stats?.totalInvited ?? 0) - (stats?.activeMinersCount ?? 0)})
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email/miner ID..."
                className="input-field text-xs w-44 py-1.5"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading referral network...</div>
          ) : filteredRoster.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-xs text-slate-400 space-y-3">
              <div className="text-3xl">🚀</div>
              <p className="max-w-md mx-auto">{t('noReferralsYet')}</p>
              <button
                type="button"
                onClick={handleNativeShare}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-black text-slate-950 shadow-md hover:scale-105 transition-all"
              >
                + Share Invite Link Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/90 text-slate-400 font-mono">
                    <th className="p-3.5">Miner Account</th>
                    <th className="p-3.5">Country</th>
                    <th className="p-3.5">Mining Status</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5 text-right">Contributed Boost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredRoster.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-mono font-bold text-white">
                        {m.maskedEmail}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-300">
                        {m.countryCode}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            m.isMiningActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              m.isMiningActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          <span>{m.isMiningActive ? t('active') : t('idle')}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-300">
                        +Tier Bonus Multiplier
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ───────────────── Decentralized Integrity Note ───────────────── */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-xs text-slate-400 space-y-1.5 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <span>🛡️</span>
            <span>{t('integrityTitle')}</span>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-400">
            {t('integrityBody')}
          </p>
        </section>
      </main>

      <MobileTabBar locale={locale} />
    </div>
  );
}
