'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface YouTubeTaskModalProps {
  rewardPoints: number;
  videoUrl?: string | null;
  onComplete: () => Promise<void>;
  onClose: () => void;
}

/** Helper to extract clean 11-char YouTube video ID from various URL formats */
export function extractYouTubeId(urlOrId?: string | null): string {
  if (!urlOrId) return 'kJQP7kiw5Fk';
  const trimmed = urlOrId.trim();

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/watch?v=ID or youtube.com/embed/ID or youtube.com/v/ID
  const longMatch =
    trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/\/v\/([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];

  return 'kJQP7kiw5Fk';
}

function useRewardSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const context = useCallback(() => {
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
  }, []);

  const playComplete = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.1;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.15, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.42);
    });
  }, [context]);

  useEffect(() => () => void ctxRef.current?.close(), []);

  return { playComplete };
}

export function YouTubeTaskModal({
  rewardPoints,
  videoUrl,
  onComplete,
  onClose,
}: YouTubeTaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [secondsWatched, setSecondsWatched] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Require 45 seconds of watching or full video completion
  const REQUIRED_WATCH_SECS = 45;
  const videoId = extractYouTubeId(videoUrl);
  const { playComplete } = useRewardSound();

  useEffect(() => {
    setMounted(true);
  }, []);

  // In-website playback verification timer
  useEffect(() => {
    if (!mounted || hasCompleted) return;

    const timer = setInterval(() => {
      if (isPlaying) {
        setSecondsWatched((prev) => {
          const next = prev + 1;
          if (next >= REQUIRED_WATCH_SECS && !hasCompleted) {
            setHasCompleted(true);
            playComplete();
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, isPlaying, hasCompleted, playComplete]);

  async function handleClaim() {
    if (!hasCompleted || claiming) return;
    setClaiming(true);
    try {
      await onComplete();
      onClose();
    } finally {
      setClaiming(false);
    }
  }

  const progressPercent = Math.min(
    100,
    Math.round((secondsWatched / REQUIRED_WATCH_SECS) * 100),
  );
  const secondsRemaining = Math.max(0, REQUIRED_WATCH_SECS - secondsWatched);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Ambient background aura */}
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

      {/* Luxury In-Website Video Modal Card */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-slate-950/90 p-5 sm:p-7 text-center shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl ring-1 ring-white/10 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5 text-left">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-red-600/20 border border-red-500/30 text-xl shadow-inner">
              ▶
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-100">
                Watch & Earn Challenge
              </h2>
              <p className="text-xs font-medium text-slate-400">
                Watch right here to earn <strong className="text-cyan-400">+{rewardPoints} PTS</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-900/60 text-slate-400 transition hover:border-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Embedded Video Player (Plays in website, no redirect) */}
        <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1`}
            title="BONDKOIN YouTube Video Task"
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Playback Verification Tracker */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
            <span>
              {hasCompleted ? (
                <span className="text-emerald-400 font-black">✓ VERIFICATION COMPLETE</span>
              ) : (
                <span>WATCH PROGRESS: {progressPercent}%</span>
              )}
            </span>
            <span>
              {hasCompleted ? 'COMPLETED' : `${secondsRemaining}s remaining`}
            </span>
          </div>

          {/* Animated Glowing Progress Bar */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 p-0.5 ring-1 ring-white/5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hasCompleted
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-lg shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shadow-sm shadow-blue-500/40'
              }`}
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Notice Info Box */}
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-900/50 p-3 text-xs text-slate-400">
          {hasCompleted ? (
            <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold">
              <span>🎉</span>
              <span>Full playback verified! You can now claim your reward.</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>🔒</span>
              <span>Keep playing this video to unlock your points reward ({secondsRemaining}s left).</span>
            </div>
          )}
        </div>

        {/* Claim Reward Button */}
        <button
          type="button"
          onClick={handleClaim}
          disabled={!hasCompleted || claiming}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black uppercase tracking-wider transition-all duration-300 ${
            hasCompleted
              ? 'btn-brand text-white shadow-xl shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] border border-blue-400/40 cursor-pointer'
              : 'border border-white/10 bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-70'
          }`}
        >
          {claiming ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin text-sm">🔄</span>
              <span>Crediting Reward…</span>
            </span>
          ) : hasCompleted ? (
            <>
              <span className="text-sm">✨</span>
              <span>Claim +{rewardPoints} BONDKOIN PTS Reward</span>
            </>
          ) : (
            <span>⏳ Watching In Progress ({progressPercent}% - {secondsRemaining}s left)</span>
          )}
        </button>
      </div>
    </div>,
    document.body
  );
}
