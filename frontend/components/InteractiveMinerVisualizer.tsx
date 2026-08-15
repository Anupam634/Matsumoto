'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Coin3D } from './Coin3D';

export function InteractiveMinerVisualizer() {
  const t = useTranslations('landing.simulator');
  const [isMining, setIsMining] = useState(false);
  const [simulatedPoints, setSimulatedPoints] = useState(0.0);
  const [temp, setTemp] = useState(48);
  const [hashPower, setHashPower] = useState(0.9);
  const [blocksMined, setBlocksMined] = useState(849201);
  const [tapEffect, setTapEffect] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    setTimeout(() => setTapEffect(false), 400);

    if (!isMining) {
      setIsMining(true);
      setHashPower(0.9);
      setBlocksMined((prev) => prev + 1);
    } else {
      setIsMining(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Outer ambient glow */}
      <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-cyan-500/30 blur-xl opacity-75 animate-pulse" />

      <div className="relative rounded-2xl border border-slate-700/80 bg-slate-950/90 p-5 shadow-2xl backdrop-blur-2xl">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 font-mono text-xs text-slate-400">
              matsumoto-rig://node-01.bep20
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{t('networkStatus')}</span>
          </div>
        </div>

        {/* 3D Coin Visual Display */}
        <div className="relative my-4 flex flex-col items-center justify-center">
          <div className="h-44 w-full flex items-center justify-center scale-90">
            <Coin3D />
          </div>

          {/* Hashrate Overlay Badge */}
          <div className="absolute top-2 right-2 rounded-lg bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 text-right shadow-lg backdrop-blur-md">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {t('baseSpeed')}
            </div>
            <div className="font-mono text-sm font-extrabold text-amber-400">
              {isMining ? `${hashPower.toFixed(2)} MATSU/h` : '0.00 MATSU/h'}
            </div>
          </div>
        </div>

        {/* Live Accumulation Box */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-center">
          <div className="text-xs uppercase font-medium tracking-wide text-amber-300/80">
            {t('pointsAccumulated')}
          </div>
          <div className="mt-1 font-mono text-3xl font-black text-amber-400 tracking-tight">
            {simulatedPoints.toFixed(5)}{' '}
            <span className="text-sm font-semibold text-amber-200">PTS</span>
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="font-mono text-cyan-400">
              ≈ {(simulatedPoints / 3).toFixed(5)} $MATSU
            </span>
            <span>•</span>
            <span className="text-emerald-400">3:1 Fixed Rate</span>
          </div>
        </div>

        {/* Interactive Tap Button */}
        <button
          type="button"
          onClick={handleToggleMine}
          className={`btn-gold relative mt-4 w-full overflow-hidden rounded-xl py-3.5 text-center text-sm uppercase tracking-wider transition-all duration-300 ${
            tapEffect ? 'scale-95' : 'hover:scale-[1.02]'
          } ${isMining ? 'ring-2 ring-emerald-400/80' : ''}`}
        >
          <div className="flex items-center justify-center gap-2 font-black text-slate-950">
            <span className="text-lg">{isMining ? '⛏️' : '⚡'}</span>
            <span>{isMining ? t('miningActive') : t('tapToMine')}</span>
          </div>
          {isMining && (
            <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
          )}
        </button>

        {/* Hardware Status Telemetry Strip */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2 text-center">
            <div className="text-slate-500 text-[10px]">TEMP</div>
            <div className="font-bold text-amber-300">{temp}°C</div>
          </div>
          <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2 text-center">
            <div className="text-slate-500 text-[10px]">EFFICIENCY</div>
            <div className="font-bold text-emerald-400">99.8%</div>
          </div>
          <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2 text-center">
            <div className="text-slate-500 text-[10px]">LOCAL POWER</div>
            <div className="font-bold text-cyan-400">0W (Cloud)</div>
          </div>
          <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2 text-center">
            <div className="text-slate-500 text-[10px]">BLOCK</div>
            <div className="font-bold text-slate-300">#{blocksMined}</div>
          </div>
        </div>

        <div className="mt-3 text-center text-[10px] text-slate-500 font-mono">
          {t('hashAlgorithm')}
        </div>
      </div>
    </div>
  );
}
