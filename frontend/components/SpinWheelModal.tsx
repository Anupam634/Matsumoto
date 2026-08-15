'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

const FULL_TURNS = 7;
const SPIN_MS = 4500;

// High-end multi-gradient segments for luxury Web3 aesthetic
const SLICE_PALETTE = [
  { fill1: '#d97706', fill2: '#f59e0b', stroke: '#fbbf24' }, // Gold
  { fill1: '#0369a1', fill2: '#0284c7', stroke: '#38bdf8' }, // Cyan
  { fill1: '#6d28d9', fill2: '#7c3aed', stroke: '#c084fc' }, // Purple
  { fill1: '#15803d', fill2: '#16a34a', stroke: '#4ade80' }, // Emerald
  { fill1: '#c2410c', fill2: '#ea580c', stroke: '#fb923c' }, // Orange
  { fill1: '#4338ca', fill2: '#4f46e5', stroke: '#818cf8' }, // Indigo
];

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function useWheelSound(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const context = useCallback(() => {
    if (muted) return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, [muted]);

  const tick = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1100;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }, [context]);

  const fanfare = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.08;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.4);
    });
  }, [context]);

  useEffect(() => () => void ctxRef.current?.close(), []);

  return { tick, fanfare };
}

export function SpinWheelModal({
  segments,
  onSpin,
  onClose,
}: {
  segments: number[];
  onSpin: () => Promise<{ index: number; earned: number }>;
  onClose: () => void;
}) {
  const t = useTranslations('tasks');
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ index: number; earned: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(localStorage.getItem('matsumoto_wheel_muted') === '1');
  }, []);

  function toggleMute() {
    setMuted((m) => {
      localStorage.setItem('matsumoto_wheel_muted', m ? '0' : '1');
      return !m;
    });
  }

  const { tick, fanfare } = useWheelSound(muted);
  const slice = 360 / segments.length;
  const numLEDs = 24;

  async function spin() {
    if (spinning || result) return;
    setSpinning(true);
    setError(null);

    let outcome: { index: number; earned: number };
    try {
      outcome = await onSpin();
    } catch (err) {
      setSpinning(false);
      setError(err instanceof Error ? err.message : t('offline'));
      return;
    }

    const target = FULL_TURNS * 360 - (outcome.index * slice + slice / 2);
    const reduced = prefersReducedMotion();
    setAngle(reduced ? -(outcome.index * slice + slice / 2) : target);

    if (reduced) {
      setResult(outcome);
      setSpinning(false);
      fanfare();
      return;
    }

    let elapsed = 0;
    const schedule = () => {
      const progress = elapsed / SPIN_MS;
      if (progress >= 1) return;
      tick();
      const gap = 50 + 380 * Math.pow(progress, 2.5);
      elapsed += gap;
      window.setTimeout(schedule, gap);
    };
    schedule();

    window.setTimeout(() => {
      setResult(outcome);
      setSpinning(false);
      fanfare();
    }, SPIN_MS);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200">
      {/* Outer ambient glow halo */}
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />

      {/* Main Luxury Transparent Glassmorphic Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-slate-950/40 p-6 sm:p-8 text-center shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl ring-1 ring-amber-400/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5 text-left">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-base">
              🎡
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-100">
                {t('wheelTitle')}
              </h2>
              <p className="text-[11px] font-medium text-slate-400">
                {t('wheelBody')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              title={muted ? t('unmute') : t('mute')}
              aria-label={muted ? t('unmute') : t('mute')}
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-300 transition hover:border-amber-400/50 hover:text-amber-400"
            >
              {muted ? <IconMuted /> : <IconSound />}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={spinning}
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-400 transition hover:border-slate-700 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ────────── Luxury Production Wheel ────────── */}
        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[19rem]">
          {/* Top 3D Neon Indicator Arrow */}
          <div
            className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-2 flex flex-col items-center"
            aria-hidden
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderTop: '24px solid #f59e0b',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 10px rgba(245,158,11,0.6))',
              }}
            />
            <div className="h-2.5 w-2.5 -mt-6 rounded-full bg-red-500 shadow-md ring-2 ring-white" />
          </div>

          {/* Wheel SVG with LED Bezel & Gradients */}
          <svg
            viewBox="-58 -58 116 116"
            className="h-full w-full rounded-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
          >
            <defs>
              {/* Radial background glow for wheel core */}
              <radialGradient id="wheelCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#030712" />
              </radialGradient>

              {/* Segment Gradients */}
              {SLICE_PALETTE.map((pal, idx) => (
                <linearGradient
                  key={idx}
                  id={`sliceGrad-${idx}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={pal.fill2} />
                  <stop offset="100%" stopColor={pal.fill1} />
                </linearGradient>
              ))}

              {/* Gold Metallic Outer Rim */}
              <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>
            </defs>

            {/* 1. Outer Bezel Ring */}
            <circle cx="0" cy="0" r="56" fill="#030712" stroke="url(#goldRim)" strokeWidth="3" />
            <circle cx="0" cy="0" r="51.5" fill="none" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1" />

            {/* 2. Perimeter LED Bulbs */}
            {Array.from({ length: numLEDs }).map((_, i) => {
              const ang = (i * (360 / numLEDs) * Math.PI) / 180;
              const x = 53.8 * Math.cos(ang);
              const y = 53.8 * Math.sin(ang);
              const activeBulb = i % 2 === 0;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1.4"
                  fill={activeBulb ? '#fef08a' : '#f59e0b'}
                  className={activeBulb ? 'animate-pulse' : ''}
                  style={{
                    filter: activeBulb ? 'drop-shadow(0 0 2px #fef08a)' : undefined,
                  }}
                />
              );
            })}

            {/* 3. Rotating Wheel Group */}
            <g
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'center',
                transition: spinning
                  ? `transform ${SPIN_MS}ms cubic-bezier(.12,.88,.2,1)`
                  : undefined,
              }}
            >
              {segments.map((value, i) => {
                const from = i * slice - 90;
                const to = from + slice;
                const rad = (deg: number) => (deg * Math.PI) / 180;
                const x1 = 50 * Math.cos(rad(from));
                const y1 = 50 * Math.sin(rad(from));
                const x2 = 50 * Math.cos(rad(to));
                const y2 = 50 * Math.sin(rad(to));
                const mid = rad(from + slice / 2);
                const won = result?.index === i;
                const palIndex = i % SLICE_PALETTE.length;

                return (
                  <g key={i}>
                    {/* Slice Shape */}
                    <path
                      d={`M0 0 L${x1} ${y1} A50 50 0 0 1 ${x2} ${y2} Z`}
                      fill={`url(#sliceGrad-${palIndex})`}
                      stroke="#ffffff"
                      strokeWidth="0.75"
                      opacity={result && !won ? 0.4 : 1}
                    />

                    {/* Outer Edge Accent Stud */}
                    <circle
                      cx={x1}
                      cy={y1}
                      r="1.2"
                      fill="#ffffff"
                      stroke="#92400e"
                      strokeWidth="0.4"
                    />

                    {/* Reward Value Label */}
                    <text
                      x={33 * Math.cos(mid)}
                      y={33 * Math.sin(mid)}
                      fill="#ffffff"
                      fontSize="7"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${i * slice + slice / 2}, ${33 * Math.cos(mid)}, ${33 * Math.sin(mid)})`}
                      style={{
                        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.9))',
                        fontFamily: 'monospace',
                      }}
                    >
                      +{value}
                    </text>
                  </g>
                );
              })}

              {/* Center Decorative Core Base */}
              <circle r="16" fill="url(#wheelCore)" stroke="url(#goldRim)" strokeWidth="2" />
            </g>
          </svg>

          {/* 4. Center Interactive 3D Metallic Hub Button */}
          <button
            type="button"
            onClick={spin}
            disabled={spinning || result !== null}
            className="absolute left-1/2 top-1/2 z-20 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full p-1 transition-all active:scale-95 disabled:opacity-80 group cursor-pointer"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #fffbeb 0%, #fbbf24 35%, #92400e 100%)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.8), 0 0 20px rgba(245,158,11,0.5)',
            }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-gradient-to-b from-amber-500 to-amber-700 text-slate-950 font-black tracking-wider uppercase shadow-inner">
              <span className="text-base drop-shadow-sm">⚡</span>
              <span className="text-[10px] tracking-widest text-slate-950 font-black -mt-0.5">
                {spinning ? '…' : t('spin')}
              </span>
            </div>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Winner Reward Celebration Box */}
        {result && (
          <div className="mt-6 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 p-4 text-center shadow-xl backdrop-blur-md animate-in zoom-in-95 duration-300">
            <div className="inline-block rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-950">
              🎉 WINNER REWARD
            </div>
            <div className="mt-1.5 font-mono text-2xl font-black text-amber-300 sm:text-3xl">
              +{result.earned} MATSU
            </div>
            <p className="mt-1 text-[11px] text-slate-300">
              Points have been credited directly to your mining balance!
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={spinning}
          className={`mt-6 w-full rounded-2xl py-3.5 text-xs font-black uppercase tracking-wider transition-all ${
            result
              ? 'btn-gold text-slate-950 shadow-xl'
              : 'border border-white/10 bg-slate-900/80 text-slate-300 hover:border-amber-400/50 hover:text-white'
          }`}
        >
          {result ? t('collect') : t('close')}
        </button>
      </div>
    </div>
  );
}

function IconSound() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z" />
    </svg>
  );
}

function IconMuted() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4Zm11 1.4L16.6 12 15 13.6 16.1 14.7 17.7 13.1l1.6 1.6 1.1-1.1L18.8 12l1.6-1.6-1.1-1.1-1.6 1.6-1.6-1.6L15 10.4Z" />
    </svg>
  );
}
