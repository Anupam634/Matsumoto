'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Which blockchain network settles Matsumoto ($MATSU) token withdrawals?',
    options: [
      'BNB Smart Chain (BEP-20)',
      'Ethereum Mainnet (ERC-20)',
      'Solana Network (SPL)',
      'Bitcoin Lightning Network',
    ],
    correctIndex: 0,
    explanation: 'Matsumoto utilizes the high-speed, low-gas BNB Smart Chain (BEP-20) for automated withdrawals.',
  },
  {
    id: 2,
    question: 'What is the official Matsumoto Point to $MATSU token conversion standard?',
    options: [
      '1 Point = 1 $MATSU',
      '3 Points = 1 $MATSU',
      '10 Points = 1 $MATSU',
      '5 Points = 1 $MATSU',
    ],
    correctIndex: 1,
    explanation: 'According to SPEC §3, 3 Matsumoto Points convert directly to 1 mainnet $MATSU token.',
  },
  {
    id: 3,
    question: 'What is the standard base cloud mining rate per hour?',
    options: [
      '0.25 MATSU/h',
      '0.50 MATSU/h',
      '0.90 MATSU/h',
      '1.50 MATSU/h',
    ],
    correctIndex: 2,
    explanation: 'Every verified miner receives a baseline cloud allocation of 0.90 MATSU points every hour.',
  },
  {
    id: 4,
    question: 'How often do miners need to check in to sustain continuous cloud mining?',
    options: [
      'Every 1 Hour',
      'Every 6 Hours',
      'Every 12 Hours',
      'Every 24 Hours',
    ],
    correctIndex: 3,
    explanation: 'Mining runs on an automated 24-hour cycle before requiring a session claim and reboot.',
  },
];

function useQuizSound(muted: boolean) {
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

  const playCorrect = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.08;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.3);
    });
  }, [context]);

  const playWrong = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    [220, 180].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.12;
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.1, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.22);
    });
  }, [context]);

  const playComplete = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.09;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.42);
    });
  }, [context]);

  useEffect(() => () => void ctxRef.current?.close(), []);

  return { playCorrect, playWrong, playComplete };
}

export function QuizModal({
  rewardPoints,
  customQuestions,
  onComplete,
  onClose,
}: {
  rewardPoints: number;
  customQuestions?: QuizQuestion[] | null;
  onComplete: () => Promise<void>;
  onClose: () => void;
}) {
  const questionsList = customQuestions && customQuestions.length > 0 ? customQuestions : QUIZ_QUESTIONS;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [muted, setMuted] = useState(false);

  const { playCorrect, playWrong, playComplete } = useQuizSound(muted);
  const currentQ = questionsList[currentIdx] || questionsList[0];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedIdx(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
      playCorrect();
    } else {
      playWrong();
    }
  };

  const handleNext = () => {
      if (currentIdx + 1 < questionsList.length) {
        setCurrentIdx((c) => c + 1);
        setSelectedIdx(null);
        setIsAnswered(false);
      } else {
        setIsFinished(true);
        playComplete();
      }
    };

    const handleClaim = async () => {
      setClaiming(true);
      try {
        await onComplete();
        onClose();
      } finally {
        setClaiming(false);
      }
    };

    const progressPercent = ((currentIdx + (isAnswered ? 1 : 0)) / questionsList.length) * 100;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200">
        {/* Radiant ambient aura */}
        <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

        {/* Transparent Glassmorphism Modal Card */}
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-slate-950/40 p-6 sm:p-8 text-center shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl ring-1 ring-white/10 transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5 text-left">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-lg">
                🧠
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-100">
                  Web3 Knowledge Challenge
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Answer correctly to earn +{rewardPoints} MATSU points
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-900/60 text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-400"
              >
                {muted ? '🔇' : '🔊'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-900/60 text-slate-400 transition hover:border-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {!isFinished ? (
            <div className="mt-5 text-left">
              {/* Progress Bar */}
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
                <span>QUESTION {currentIdx + 1} OF {questionsList.length}</span>
                <span className="text-cyan-400">SCORE: {score}/{questionsList.length}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Question Box */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md">
                <p className="text-base font-extrabold text-slate-100 leading-snug">
                  {currentQ.question}
                </p>
              </div>

              {/* Options List */}
              <div className="mt-4 space-y-2.5">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedIdx === idx;
                  const isCorrect = idx === currentQ.correctIndex;
                  let btnStyle = 'border-white/10 bg-slate-900/40 text-slate-200 hover:border-cyan-400/50 hover:bg-slate-900/60';

                  if (isAnswered) {
                    if (isCorrect) {
                      btnStyle = 'border-emerald-500/80 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50 shadow-lg';
                    } else if (isSelected) {
                      btnStyle = 'border-red-500/80 bg-red-500/20 text-red-300 ring-1 ring-red-400/50';
                    } else {
                      btnStyle = 'opacity-40 border-white/5 bg-slate-900/20 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(idx)}
                      disabled={isAnswered}
                      className={`w-full text-left rounded-2xl border p-3.5 text-sm font-semibold transition-all duration-200 flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{option}</span>
                      {isAnswered && (
                        <span className="font-bold text-xs">
                          {isCorrect ? '✓ CORRECT' : isSelected ? '✕ WRONG' : ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Note & Next Button */}
              {isAnswered && (
                <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-200 leading-relaxed backdrop-blur-md">
                    💡 <strong>Explanation:</strong> {currentQ.explanation}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-gold w-full rounded-2xl py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg"
                  >
                    {currentIdx + 1 === questionsList.length ? 'Finish Challenge →' : 'Next Question →'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Finished Screen */
            <div className="mt-6 text-center animate-in zoom-in-95 duration-300">
              <div className="inline-grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-3xl shadow-xl">
                🏆
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-100">
                Quiz Completed!
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                You scored {score} out of {questionsList.length} questions correctly.
              </p>

            <div className="mt-5 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 p-4 backdrop-blur-md">
              <div className="text-xs uppercase font-black tracking-widest text-amber-400">
                BOUNTY REWARD UNLOCKED
              </div>
              <div className="mt-1 font-mono text-3xl font-black text-amber-300">
                +{rewardPoints} MATSU
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="btn-gold mt-6 w-full rounded-2xl py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-xl"
            >
              {claiming ? 'Crediting Bounty…' : 'Claim Reward & Close →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
