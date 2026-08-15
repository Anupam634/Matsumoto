'use client';

import React, { useState } from 'react';
import type { AdminTaskItem, AdminQuizQuestion } from '../../../lib/admin-api';

interface FullTaskEditorModalProps {
  task: AdminTaskItem;
  onClose: () => void;
  onSave: (dto: any) => void;
}

export function FullTaskEditorModal({
  task,
  onClose,
  onSave,
}: FullTaskEditorModalProps) {
  const [title, setTitle] = useState(task.title);
  const [rewardPoints, setRewardPoints] = useState(String(task.rewardPoints));
  const [cooldownHours, setCooldownHours] = useState(String(task.cooldownHours));
  const [active, setActive] = useState(task.active);
  const [actionUrl, setActionUrl] = useState(task.actionUrl ?? '');

  // 1. Web3 Quiz Questions State
  const [quizQuestions, setQuizQuestions] = useState<AdminQuizQuestion[]>(
    task.quizQuestions && task.quizQuestions.length > 0
      ? task.quizQuestions
      : [
          {
            id: 1,
            question: 'What is Matsumoto protocol token standard?',
            options: ['BEP-20 (BNB Chain)', 'ERC-20', 'TRC-20', 'SPL Token'],
            correctIndex: 0,
            explanation:
              'Matsumoto is built natively on BNB Smart Chain utilizing the BEP-20 token standard.',
          },
        ],
  );

  // 2. Lucky Spin Wheel Slices State
  const [wheelSegments, setWheelSegments] = useState<number[]>(
    task.wheelSegments && task.wheelSegments.length > 0
      ? task.wheelSegments
      : [10, 25, 50, 100, 250, 500, 1000, 5],
  );

  function handleAddQuestion() {
    setQuizQuestions([
      ...quizQuestions,
      {
        id: Date.now(),
        question: 'New Question Title',
        options: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
        correctIndex: 0,
        explanation: 'Explanation for correct choice.',
      },
    ]);
  }

  function handleRemoveQuestion(idx: number) {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  }

  function handleUpdateQuestion(
    idx: number,
    field: keyof AdminQuizQuestion,
    val: any,
  ) {
    const updated = [...quizQuestions];
    (updated[idx] as any)[field] = val;
    setQuizQuestions(updated);
  }

  function handleUpdateOption(qIdx: number, optIdx: number, val: string) {
    const updated = [...quizQuestions];
    updated[qIdx].options[optIdx] = val;
    setQuizQuestions(updated);
  }

  function handleUpdateWheelSegment(idx: number, val: number) {
    const updated = [...wheelSegments];
    updated[idx] = val;
    setWheelSegments(updated);
  }

  function handleAddWheelSlice() {
    setWheelSegments([...wheelSegments, 50]);
  }

  function handleRemoveWheelSlice(idx: number) {
    if (wheelSegments.length <= 4) return alert('Wheel needs at least 4 slices.');
    setWheelSegments(wheelSegments.filter((_, i) => i !== idx));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      title,
      rewardPoints: Number(rewardPoints),
      cooldownHours: Number(cooldownHours),
      active,
      actionUrl: actionUrl || undefined,
      quizQuestions: task.type === 'QUIZ' ? quizQuestions : undefined,
      wheelSegments: task.type === 'SPIN_WHEEL' ? wheelSegments : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <form
        onSubmit={submit}
        className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto border-slate-800 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-xl font-black text-white">
              Full Task Editor: {task.type}
            </h3>
            <p className="text-xs text-slate-400">
              Configure questions, rewards, slice probabilities and URLs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            ✕ Close
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* General Task Info */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400">
                Base Reward (PTS)
              </label>
              <input
                type="number"
                value={rewardPoints}
                onChange={(e) => setRewardPoints(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-bold text-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400">
                Cooldown (Hours)
              </label>
              <input
                type="number"
                value={cooldownHours}
                onChange={(e) => setCooldownHours(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white"
                required
              />
            </div>
          </div>

          {/* Social Bounties URL */}
          {task.type !== 'QUIZ' && task.type !== 'SPIN_WHEEL' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400">
                Target Social Action Link
              </label>
              <input
                type="url"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="https://x.com/intent/post?text=..."
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-cyan-400 font-mono"
              />
            </div>
          )}

          {/* WEB3 QUIZ QUESTIONS EDITOR */}
          {task.type === 'QUIZ' && (
            <div className="rounded-2xl border border-indigo-500/30 bg-slate-950/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-indigo-300">
                    🧠 Web3 Quiz Questions ({quizQuestions.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Edit question text, 4 choices, and select the correct answer index
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-900/60"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-4">
                {quizQuestions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-400">
                        Question #{qIdx + 1}
                      </span>
                      {quizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          ✕ Delete
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) =>
                        handleUpdateQuestion(qIdx, 'question', e.target.value)
                      }
                      placeholder="Question prompt…"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-white"
                      required
                    />

                    {/* 4 Choices */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() =>
                              handleUpdateQuestion(qIdx, 'correctIndex', optIdx)
                            }
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              handleUpdateOption(qIdx, optIdx, e.target.value)
                            }
                            placeholder={`Choice ${String.fromCharCode(65 + optIdx)}`}
                            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-200"
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500">
                        Explanation
                      </label>
                      <input
                        type="text"
                        value={q.explanation ?? ''}
                        onChange={(e) =>
                          handleUpdateQuestion(qIdx, 'explanation', e.target.value)
                        }
                        placeholder="Educational explanation shown after submitting answer…"
                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-xs text-slate-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LUCKY WHEEL SLICES EDITOR */}
          {task.type === 'SPIN_WHEEL' && (
            <div className="rounded-2xl border border-amber-500/30 bg-slate-950/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-amber-300">
                    🎡 Lucky Wheel Slices Configuration
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Configure each slice point reward on the 360° wheel
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddWheelSlice}
                  className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/60"
                >
                  + Add Slice
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {wheelSegments.map((val, sIdx) => (
                  <div
                    key={sIdx}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 mb-1">
                      <span>Slice #{sIdx + 1}</span>
                      {wheelSegments.length > 4 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveWheelSlice(sIdx)}
                          className="text-red-400 hover:underline"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={val}
                        onChange={(e) =>
                          handleUpdateWheelSegment(sIdx, Number(e.target.value))
                        }
                        className="w-20 rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-center font-mono text-sm font-black text-amber-400"
                        required
                      />
                      <span className="text-[10px] font-bold text-slate-400">PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 pt-2 text-xs font-bold text-slate-300">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded"
            />
            <span>Active & Claimable by Miners</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-gold rounded-xl px-6 py-2.5 text-xs font-black uppercase text-slate-950"
          >
            Save Full Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
