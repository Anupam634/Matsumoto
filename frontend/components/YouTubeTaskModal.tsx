'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeTaskModalProps {
  rewardPoints: number;
  videoUrl?: string | null;
  onComplete: () => Promise<void>;
  onClose: () => void;
}

/** Helper to extract clean 11-char YouTube video ID from various URL formats */
export function extractYouTubeId(urlOrId?: string | null): string {
  if (!urlOrId) return 'kJQP7kiw5Fk'; // Default dummy Web3 YouTube video
  const trimmed = urlOrId.trim();

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/watch?v=ID or youtube.com/embed/ID or youtube.com/v/ID
  const longMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
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
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [claiming, setClaiming] = useState(false);

  const playerRef = useRef<any>(null);
  const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  const videoId = extractYouTubeId(videoUrl);
  const { playComplete } = useRewardSound();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load YouTube IFrame API and initialize player
  useEffect(() => {
    if (!mounted) return;

    let timer: NodeJS.Timeout;

    function initPlayer() {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(containerId.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setPlayerReady(true);
            const dur = event.target.getDuration();
            if (dur && dur > 0) setDuration(dur);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING === 1
            if (event.data === 1) {
              setIsPlaying(true);
              const dur = event.target.getDuration();
              if (dur && dur > 0) setDuration(dur);
            } else if (event.data === 2) {
              // PAUSED === 2
              setIsPlaying(false);
            } else if (event.data === 0) {
              // ENDED === 0 -> video finished!
              setIsPlaying(false);
              setHasCompleted(true);
              setProgressPercent(100);
              playComplete();
            }
          },
        },
      });
    }

    // Load YT API script if not loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    // Interval to poll playback progress
    timer = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const curr = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          if (dur > 0) {
            setDuration(dur);
            setCurrentTime(curr);
            const pct = Math.min(100, Math.round((curr / dur) * 100));
            setProgressPercent(pct);
            // If user reaches >= 96% of video length
            if (pct >= 96 && !hasCompleted) {
              setHasCompleted(true);
              playComplete();
            }
          }
        } catch {
          // ignore cross-origin polling error
        }
      }
    }, 500);

    return () => {
      clearInterval(timer);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [mounted, videoId, hasCompleted, playComplete]);

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

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Radiant ambient glow aura */}
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

      {/* Luxury Glassmorphism Modal Card */}
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
                Watch the full video to claim your <strong className="text-cyan-400">+{rewardPoints} PTS</strong> reward
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

        {/* YouTube Video Player Embed Box */}
        <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <div id={containerId.current} className="h-full w-full" />
        </div>

        {/* Playback Progress Tracker */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
            <span>
              {hasCompleted ? (
                <span className="text-emerald-400 font-black">✓ FULL VIDEO WATCHED</span>
              ) : (
                <span>WATCH PROGRESS: {progressPercent}%</span>
              )}
            </span>
            <span>
              {formatTime(currentTime)} / {formatTime(duration || 60)}
            </span>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80 p-0.5 ring-1 ring-white/5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hasCompleted
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-lg shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Requirement Note / Status */}
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-900/50 p-3 text-xs text-slate-400">
          {hasCompleted ? (
            <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold">
              <span>🎉</span>
              <span>Verification complete! You can now claim your reward.</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>ℹ️</span>
              <span>Please play and finish the video without skipping to unlock reward.</span>
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
            <span>⏳ Play & Finish Video To Unlock ({progressPercent}%)</span>
          )}
        </button>
      </div>
    </div>,
    document.body
  );
}
