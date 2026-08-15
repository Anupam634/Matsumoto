'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Coin3D } from './Coin3D';
import { useMiningFX } from '../lib/use-mining-fx';

export function InteractiveMinerVisualizer() {
  const t = useTranslations('landing.simulator');
  const [isMining, setIsMining] = useState(false);
  const [simulatedPoints, setSimulatedPoints] = useState(0.0);
  const [temp, setTemp] = useState(48);
  const [hashPower, setHashPower] = useState(0.9);
  const [tapEffect, setTapEffect] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { playMiningStrike, playClaimReward } = useMiningFX();

  useEffect(() => {
    if (isMining) {
      intervalRef.current = setInterval(() => {
        setSimulatedPoints((prev) => +(prev + 0.00045).toFixed(5));
        setTemp((prev) => 52 + Math.floor(Math.sin(Date.now() / 2000) * 4));
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMining]);

  const handleToggleMine = () => {
    setTapEffect(true);
    setTimeout(() => setTapEffect(false), 350);

    if (!isMining) {
      playMiningStrike();
      setIsMining(true);
      setHashPower(0.9);
    } else {
      playClaimReward();
      setIsMining(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Dynamic 3D ambient aura */}
      <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-cyan-500/25 blur-2xl opacity-80" />

      {/* 3D Glass Container */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-sm" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80 shadow-sm" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-sm" />
            <span className="ml-2 font-mono text-xs text-slate-400 font-semibold">
              matsumoto://cloud-cluster.bep20
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400 backdrop-blur-md">
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span>{t('networkStatus')}</span>
          </div>
        </div>

        {/* 3D Holographic Coin Display */}
        <div className="relative my-3 flex flex-col items-center justify-center">
          <div className="h-44 w-full flex items-center justify-center scale-95">
            <Coin3D />
          </div>

          {/* Hashrate Floating Badge */}
          <div className="absolute top-2 right-2 rounded-xl bg-slate-900/80 border border-amber-500/40 px-3.5 py-2 text-right shadow-xl backdrop-blur-xl">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              {t('baseSpeed')}
            </div>
            <div className="font-mono text-sm font-black text-amber-400">
              {isMining ? `${hashPower.toFixed(2)} MATSU/h` : '0.00 MATSU/h'}
            </div>
          </div>
        </div>

        {/* Real-time Point Accumulator Box */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent p-4 text-center backdrop-blur-md">
          <div className="text-xs uppercase font-bold tracking-wider text-amber-300/90">
            {t('pointsAccumulated')}
          </div>
          <div className="mt-1 font-mono text-3xl font-black text-amber-400 tracking-tight sm:text-4xl">
            {simulatedPoints.toFixed(5)}{' '}
            <span className="text-sm font-extrabold text-amber-200">PTS</span>
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-cyan-400 font-semibold">
              ≈ {(simulatedPoints / 3).toFixed(5)} $MATSU
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">3:1 Fixed Conversion</span>
          </div>
        </div>

        {/* Interactive Tap Button */}
        <div className="relative mt-4">
          {tapEffect && <div className="mine-shockwave" />}
          <button
            type="button"
            onClick={handleToggleMine}
            className={`btn-gold relative w-full overflow-hidden rounded-2xl py-4 text-center text-sm uppercase tracking-wider transition-all duration-300 shadow-xl ${
              tapEffect ? 'scale-95' : 'hover:scale-[1.01]'
            } ${isMining ? 'ring-2 ring-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : ''}`}
          >
            <div className="flex items-center justify-center gap-2.5 font-black text-slate-950">
              <span className="text-xl">{isMining ? '⛏️' : '⚡'}</span>
              <span>{isMining ? t('miningActive') : t('tapToMine')}</span>
            </div>
          </button>
        </div>

        {/* Hardware Status Telemetry Strip */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400">
          <div className="rounded-xl bg-slate-900/60 border border-white/[0.06] p-2.5 text-center">
            <div className="text-slate-500 text-[10px] uppercase font-bold">NODE TEMP</div>
            <div className="font-bold text-amber-300 mt-0.5">{temp}°C</div>
          </div>
          <div className="rounded-xl bg-slate-900/60 border border-white/[0.06] p-2.5 text-center">
            <div className="text-slate-500 text-[10px] uppercase font-bold">EFFICIENCY</div>
            <div className="font-bold text-emerald-400 mt-0.5">99.8%</div>
          </div>
          <div className="rounded-xl bg-slate-900/60 border border-white/[0.06] p-2.5 text-center">
            <div className="text-slate-500 text-[10px] uppercase font-bold">LOCAL POWER</div>
            <div className="font-bold text-cyan-400 mt-0.5">0W (Cloud)</div>
          </div>
        </div>

        <div className="mt-3 text-center text-[10px] text-slate-500 font-mono">
          {t('hashAlgorithm')}
        </div>
      </div>
    </div>
  );
}
