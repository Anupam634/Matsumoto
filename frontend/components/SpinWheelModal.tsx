'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

const FULL_TURNS = 6;
const SPIN_MS = 4200;

const SLICE_FILL = [
  '#d97706', // amber
  '#0284c7', // cyan
  '#7c3aed', // purple
  '#16a34a', // green
  '#ea580c', // orange
  '#4f46e5', // indigo
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
    osc.type = 'square';
    osc.frequency.value = 900;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }, [context]);

  const fanfare = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.09;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.36);
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
  const [result, setResult] = useState<{ index: number; earned: number } | null>(
    null,
  );
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
      const gap = 55 + 365 * progress * progress;
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-md flex items-center justify-center">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-slate-950/90 p-6 text-center shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="text-left">
            <h2 className="text-xl font-black text-slate-100">{t('wheelTitle')}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{t('wheelBody')}</p>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? t('unmute') : t('mute')}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-slate-900/60 text-slate-300 transition hover:border-amber-400/50 hover:text-amber-400"
          >
            {muted ? <IconMuted /> : <IconSound />}
          </button>
        </div>

        {/* Wheel Container */}
        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[17rem]">
          {/* Glowing Golden Pointer */}
          <div
            className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 -translate-y-1"
            style={{
              borderLeft: '0.75rem solid transparent',
              borderRight: '0.75rem solid transparent',
              borderTop: '1.25rem solid #f59e0b',
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7))',
            }}
            aria-hidden
          />

          <svg
            viewBox="-50 -50 100 100"
            className="h-full w-full rounded-full ring-4 ring-amber-400/40 shadow-2xl"
            style={{
              transform: `rotate(${angle}deg)`,
              transition: spinning
                ? `transform ${SPIN_MS}ms cubic-bezier(.15,.85,.2,1)`
                : undefined,
            }}
            role="img"
            aria-label={t('wheelAria', { n: segments.length })}
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
              return (
                <g key={i}>
                  <path
                    d={`M0 0 L${x1} ${y1} A50 50 0 0 1 ${x2} ${y2} Z`}
                    fill={SLICE_FILL[i % SLICE_FILL.length]}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                    opacity={result && !won ? 0.45 : 1}
                  />
                  <text
                    x={32 * Math.cos(mid)}
                    y={32 * Math.sin(mid)}
                    fill="#ffffff"
                    fontSize="7.5"
                    fontWeight="900"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                    }}
                  >
                    +{value}
                  </text>
                </g>
              );
            })}
            <circle r="14" fill="#030712" stroke="#f59e0b" strokeWidth="1.5" />
          </svg>

          {/* Central Spin Button */}
          <button
            type="button"
            onClick={spin}
            disabled={spinning || result !== null}
            className="btn-gold absolute left-1/2 top-1/2 z-20 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-black uppercase tracking-wider text-slate-950 shadow-xl transition active:scale-95 disabled:opacity-75 disabled:grayscale"
          >
            {spinning ? '…' : t('spin')}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
            <div className="text-xs uppercase font-bold text-emerald-400">Congratulations!</div>
            <div className="mt-0.5 font-mono text-xl font-black text-amber-300">
              {t('wheelWon', { points: result.earned })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={spinning}
          className={`mt-5 w-full rounded-xl py-3 text-xs font-extrabold uppercase tracking-wider transition-all ${
            result
              ? 'btn-gold text-slate-950 shadow-lg'
              : 'border border-white/10 bg-slate-900/60 text-slate-300 hover:border-amber-400/50 hover:text-white'
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
