'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { ClaimTaskResultDto } from '../lib/api';

/**
 * A question as the client sees it. No `correctIndex`, no `explanation`:
 * this modal used to be handed both and decide for itself whether the miner
 * had passed, which meant the answers sat in the network payload and the
 * grade meant nothing. The server marks the submission now.
 */
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Which blockchain network settles BONDKOIN ($BONDKOIN) token withdrawals?',
    options: [
      'BNB Smart Chain (BEP-20)',
      'Ethereum Mainnet (ERC-20)',
      'Solana Network (SPL)',
      'Bitcoin Lightning Network',
    ],
  },
  {
    id: 2,
    question: 'What is the official BONDKOIN Point to $BONDKOIN token conversion standard?',
    options: [
      '1 Point = 1 $BONDKOIN',
      '3 Points = 1 $BONDKOIN',
      '10 Points = 1 $BONDKOIN',
      '5 Points = 1 $BONDKOIN',
    ],
  },
  {
    id: 3,
    question: 'What is the standard base node mining rate per hour?',
    options: [
      '0.25 BONDKOIN/h',
      '0.50 BONDKOIN/h',
      '0.90 BONDKOIN/h',
      '1.50 BONDKOIN/h',
    ],
  },
  {
    id: 4,
    question: 'How often do miners need to check in to sustain continuous node mining?',
    options: [
      'Every 1 Hour',
      'Every 6 Hours',
      'Every 12 Hours',
      'Every 24 Hours',
    ],
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

  return { playCorrect, playWrong, playComplete };
}

export function QuizModal({
  rewardPoints,
  customQuestions,
  onSubmit,
  onClose,
}: {
  rewardPoints: number;
  customQuestions?: QuizQuestion[] | null;
  /** Sends the answers to be marked and returns what the server awarded. */
  onSubmit: (answers: number[]) => Promise<ClaimTaskResultDto>;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const questionsList = customQuestions && customQuestions.length > 0 ? customQuestions : QUIZ_QUESTIONS;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ClaimTaskResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { playCorrect, playWrong, playComplete } = useQuizSound(muted);
  const currentQ = questionsList[currentIdx] || questionsList[0];
  const selectedIdx = answers[currentIdx] ?? null;
  const isAnswered = selectedIdx !== null;
  const isLast = currentIdx + 1 === questionsList.length;

  // Selecting is now just recording a choice — there is nothing to mark
  // against until the whole set goes to the server, so an answer can still be
  // changed while the miner is on the question.
  const handleSelect = (idx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = idx;
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit(answers);
      setOutcome(result);
      const quiz = result.quiz;
      if (quiz && quiz.correctCount === quiz.total) playCorrect();
      else if (quiz && quiz.correctCount === 0) playWrong();
      else playComplete();
    } catch (err) {
      // Stay on the last question so the answers are not lost to a blip.
      setError(err instanceof Error ? err.message : 'Could not submit the quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIdx((c) => c + 1);
      return;
    }
    void handleSubmit();
  };

  if (!mounted) return null;

  const answeredCount = answers.filter((a) => a !== undefined).length;
  const progressPercent = (answeredCount / questionsList.length) * 100;
  const quiz = outcome?.quiz ?? null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Radiant ambient aura */}
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

      {/* Transparent Glassmorphism Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-slate-950/80 p-6 sm:p-8 text-center shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl ring-1 ring-white/10 transition-all">
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
                  Answer correctly to earn +{rewardPoints} BONDKOIN points
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

          {!quiz ? (
            <div className="mt-5 text-left">
              {/* Progress Bar */}
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
                <span>QUESTION {currentIdx + 1} OF {questionsList.length}</span>
                <span className="text-cyan-400">ANSWERED: {answeredCount}/{questionsList.length}</span>
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

              {/* Options List. Selection only — the marking comes back with
                  the claim, so there is nothing to colour green here yet. */}
              <div className="mt-4 space-y-2.5">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedIdx === idx;
                  const btnStyle = isSelected
                    ? 'border-cyan-400/80 bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/50 shadow-lg'
                    : 'border-white/10 bg-slate-900/40 text-slate-200 hover:border-cyan-400/50 hover:bg-slate-900/60';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(idx)}
                      disabled={submitting}
                      className={`w-full text-left rounded-2xl border p-3.5 text-sm font-semibold transition-all duration-200 flex items-center justify-between disabled:opacity-60 ${btnStyle}`}
                    >
                      <span>{option}</span>
                      {isSelected && <span className="text-xs font-bold">●</span>}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                {currentIdx > 0 && !submitting && (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((c) => c - 1)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/40 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
                  >
                    ← Back
                  </button>
                )}

                {error && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-semibold text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isAnswered || submitting}
                  className="btn-gold w-full rounded-2xl py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting
                    ? 'Marking…'
                    : !isAnswered
                      ? 'Choose an answer'
                      : isLast
                        ? 'Submit Answers →'
                        : 'Next Question →'}
                </button>

                {isLast && isAnswered && !submitting && (
                  <p className="text-center text-[11px] font-medium text-slate-500">
                    Answers are marked once. You can try again after the cooldown.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Result screen — everything here comes from the server's
               marking, including the explanations, which are withheld until
               the answers are in. */
            <div className="mt-6 animate-in zoom-in-95 duration-300">
              <div className="text-center">
                <div className="inline-grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-3xl shadow-xl">
                  {quiz.correctCount === quiz.total ? '🏆' : '📘'}
                </div>
                <h3 className="mt-4 text-2xl font-black text-slate-100">
                  {quiz.correctCount === quiz.total
                    ? 'Perfect Score!'
                    : 'Quiz Completed'}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  You answered {quiz.correctCount} of {quiz.total} correctly.
                </p>

                <div className="mt-5 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 p-4 backdrop-blur-md">
                  <div className="text-xs uppercase font-black tracking-widest text-amber-400">
                    {outcome && outcome.earnedPoints > 0
                      ? 'Bounty Credited'
                      : 'No Points This Round'}
                  </div>
                  <div className="mt-1 font-mono text-3xl font-black text-cyan-300">
                    +{outcome?.earnedPoints ?? 0} BONDKOIN PTS
                  </div>
                  {quiz.correctCount < quiz.total && (
                    <div className="mt-1 text-[11px] font-medium text-amber-200/80">
                      {quiz.correctCount}/{quiz.total} of the full {rewardPoints} pts
                    </div>
                  )}
                </div>
              </div>

              {/* Per-question review */}
              <div className="mt-5 max-h-64 space-y-2.5 overflow-y-auto pr-1 text-left">
                {quiz.results.map((r, i) => {
                  const q = questionsList[i];
                  return (
                    <div
                      key={r.id}
                      className={`rounded-2xl border p-3 backdrop-blur-md ${
                        r.correct
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-red-500/40 bg-red-500/10'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-black">
                          {r.correct ? '✓' : '✕'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-snug text-slate-100">
                            {q?.question}
                          </p>
                          {!r.correct && (
                            <p className="mt-1 text-[11px] font-semibold text-emerald-300">
                              Correct answer: {q?.options[r.correctIndex]}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                            💡 {r.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="btn-brand mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl"
              >
                Close →
              </button>
            </div>
        )}
      </div>
    </div>,
    document.body
  );
}
