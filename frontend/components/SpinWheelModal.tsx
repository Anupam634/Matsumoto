'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

/** Full turns before the wheel settles, so it reads as a spin not a nudge. */
const FULL_TURNS = 6;
const SPIN_MS = 4200;

const SLICE_FILL = [
  '#4f46e5',
  '#f59e0b',
  '#6366f1',
  '#facc15',
  '#4338ca',
  '#818cf8',
];

/** Whether the visitor has asked for less motion. */
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Wheel sounds, synthesised with Web Audio rather than shipped as files: a
 * tick per segment passed and a short arpeggio on landing. No asset to
 * download, and the pitch can follow the wheel as it slows.
 *
 * The context is created on the click that starts the spin, which is the
 * gesture browsers require before audio may play.
 */
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
  /** Point value of each segment, in wheel order. */
  segments: number[];
  /**
   * Runs the real claim. Resolves with the segment the server drew, which is
   * where the wheel must stop — the animation reports the outcome, it does
   * not choose it.
   */
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

  // Remember the sound choice; being blasted twice is once too many.
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

    // Land the middle of the winning slice under the pointer at the top.
    const target =
      FULL_TURNS * 360 - (outcome.index * slice + slice / 2);
    const reduced = prefersReducedMotion();
    setAngle(reduced ? -(outcome.index * slice + slice / 2) : target);

    if (reduced) {
      setResult(outcome);
      setSpinning(false);
      fanfare();
      return;
    }

    // Tick as segments pass, thinning out as the wheel slows.
    let elapsed = 0;
    const schedule = () => {
      const progress = elapsed / SPIN_MS;
      if (progress >= 1) return;
      tick();
      // Ease-out: gaps stretch from 55ms to ~420ms by the end.
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <div className="panel w-full max-w-sm p-6 text-center">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold">{t('wheelTitle')}</h2>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? t('unmute') : t('mute')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-slate-300 transition hover:border-indigo-400/50"
            >
              {muted ? <IconMuted /> : <IconSound />}
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400">{t('wheelBody')}</p>

          <div className="relative mx-auto mt-6 aspect-square w-full max-w-[17rem]">
            {/* Pointer, fixed at the top; the wheel turns beneath it. */}
            <div
              className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 -translate-y-1"
              style={{
                borderLeft: '0.7rem solid transparent',
                borderRight: '0.7rem solid transparent',
                borderTop: '1.1rem solid #f8fafc',
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))',
              }}
              aria-hidden
            />
            <svg
              viewBox="-50 -50 100 100"
              className="h-full w-full rounded-full ring-4 ring-white/10"
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
                // Slices start at 12 o'clock and run clockwise.
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
                      stroke="rgba(255,255,255,.18)"
                      strokeWidth="0.5"
                      opacity={result && !won ? 0.45 : 1}
                    />
                    <text
                      x={32 * Math.cos(mid)}
                      y={32 * Math.sin(mid)}
                      fill="#fff"
                      fontSize="8"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}
              <circle r="13" fill="#0b0e17" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
            </svg>

            {/* The hub is the button, so "spin" means pressing the middle. */}
            <button
              type="button"
              onClick={spin}
              disabled={spinning || result !== null}
              className="absolute left-1/2 top-1/2 z-10 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-700 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg transition disabled:opacity-70 enabled:hover:brightness-110"
            >
              {spinning ? '…' : t('spin')}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {result && (
            <p className="mt-5 text-lg font-extrabold text-emerald-400">
              {t('wheelWon', { points: result.earned })}
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={spinning}
            className={`mt-5 w-full py-2.5 text-sm ${result ? 'btn-primary' : 'btn-outline-brand'}`}
          >
            {result ? t('collect') : t('close')}
          </button>
        </div>
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
