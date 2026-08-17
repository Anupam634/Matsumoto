'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SpinWheelModal } from '../../../components/SpinWheelModal';
import { QuizModal } from '../../../components/QuizModal';
import { ApiError, claimTask, getTasks, type TaskDto } from '../../../lib/api';

/** i18n key per task type — the labels already exist under `tasks.*`. */
const LABEL_KEY: Record<TaskDto['type'], string> = {
  TWEET: 'tweet',
  FOLLOW: 'follow',
  REPOST: 'repost',
  YOUTUBE: 'youtube',
  QUIZ: 'quiz',
  SPIN_WHEEL: 'spin',
};

const ICON: Record<TaskDto['type'], string> = {
  TWEET: '𝕏',
  FOLLOW: '➕',
  REPOST: '🔁',
  YOUTUBE: '▶',
  QUIZ: '🧠',
  SPIN_WHEEL: '🎡',
};

export default function TasksSection({
  onClaimed,
}: {
  /** Lets the dashboard re-pull the balance after a task pays out. */
  onClaimed: () => void;
}) {
  const t = useTranslations('dashboard');
  const taskLabels = useTranslations('tasks');

  const [tasks, setTasks] = useState<TaskDto[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [wheelTask, setWheelTask] = useState<TaskDto | null>(null);
  const [quizTask, setQuizTask] = useState<TaskDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [won, setWon] = useState<{ id: string; points: number } | null>(null);

  const load = useCallback(async () => {
    try {
      setTasks(await getTasks());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function claim(task: TaskDto) {
    if (task.type === 'SPIN_WHEEL' && task.wheelSegments) {
      setWheelTask(task);
      return;
    }

    if (task.type === 'QUIZ') {
      setQuizTask(task);
      return;
    }

    setBusyId(task.id);
    setError(null);
    try {
      const res = await claimTask(task.id);
      setWon({ id: task.id, points: res.earnedPoints });
      setTimeout(() => setWon(null), 2000);
      await load();
      onClaimed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusyId(null);
    }
  }

  /** Runs the real claim for the wheel and hands back where it must stop. */
  async function spinFor(task: TaskDto) {
    const res = await claimTask(task.id);
    // The list and balance refresh behind the modal while it is still
    // spinning, so closing it reveals an already-settled dashboard.
    void load().then(onClaimed);
    return { index: res.spinIndex ?? 0, earned: res.earnedPoints };
  }

  if (!tasks) {
    return (
      <section className="glass-panel mt-4 p-5 sm:p-6">
        <div className="skeleton h-5 w-32" />
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="glass-panel rise-in mt-4 p-5 sm:p-7"
      style={{ '--i': 5 } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-base">
            🎁
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white sm:text-lg">
              {t('tasksTitle')}
            </h2>
            <p className="text-xs text-slate-400">{t('tasksSubtitle')}</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-500/10 border border-blue-500/25 px-3 py-1 text-xs font-mono font-bold text-blue-300">
          Instant Credit
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            data-task={task.type}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4.5 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-blue-500/10"
          >
            {won?.id === task.id && (
              <span className="float-up absolute left-1/2 top-3 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500/25 border border-emerald-400/50 px-3.5 py-1 text-sm font-black text-emerald-300 backdrop-blur-md shadow-lg shadow-emerald-500/20">
                +{won.points.toFixed(2)} PTS
              </span>
            )}

            <div className="flex items-start gap-3">
              {task.type === 'SPIN_WHEEL' ? (
                <SpinWheel spinning={false} />
              ) : (
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-500/30 bg-blue-600/15 text-lg shadow-inner transition-transform group-hover:scale-105"
                  aria-hidden
                >
                  {ICON[task.type]}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  {taskLabels(LABEL_KEY[task.type])}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
                  <span>
                    {task.wheelSegments
                      ? `${Math.min(...task.wheelSegments)}–${Math.max(...task.wheelSegments)}`
                      : `+${task.rewardPoints}`}
                  </span>
                  <span className="text-[11px] text-slate-400">{t('pointsShort')}</span>
                </div>
              </div>
            </div>

            {/* Rounded Glass Glowing Claim Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => claim(task)}
                disabled={!task.canClaim || busyId === task.id}
                className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-2.5 px-4 text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  task.canClaim
                    ? 'btn-brand shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] border border-blue-400/40 text-white'
                    : 'border border-white/10 bg-slate-950/70 text-slate-400 backdrop-blur-md cursor-not-allowed opacity-75'
                }`}
              >
                {busyId === task.id ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin text-sm">🔄</span>
                    <span>{t('working')}</span>
                  </span>
                ) : task.canClaim ? (
                  <>
                    <span className="text-sm transition-transform group-hover/btn:rotate-12">✨</span>
                    <span>{t('claim')}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span>⏱️</span>
                    <Cooldown iso={task.nextAvailableAt} label={t('cooldownShort')} />
                  </span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {wheelTask?.wheelSegments && (
        <SpinWheelModal
          segments={wheelTask.wheelSegments}
          onSpin={() => spinFor(wheelTask)}
          onClose={() => setWheelTask(null)}
        />
      )}

      {quizTask && (
        <QuizModal
          rewardPoints={quizTask.rewardPoints}
          customQuestions={quizTask.quizQuestions}
          onComplete={async () => {
            const res = await claimTask(quizTask.id);
            setWon({ id: quizTask.id, points: res.earnedPoints });
            setTimeout(() => setWon(null), 2000);
            await load();
            onClaimed();
          }}
          onClose={() => setQuizTask(null)}
        />
      )}
    </section>
  );
}

/** A wheel that actually spins — decorative, the reward is server-set. */
function SpinWheel({ spinning }: { spinning: boolean }) {
  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-indigo-500/30 text-lg shadow-inner ${
        spinning ? 'wheel-spin' : ''
      }`}
      style={{
        background:
          'conic-gradient(#3b82f6 0 60deg,#818cf8 60deg 120deg,#7c3aed 120deg 180deg,#6366f1 180deg 240deg,#2563eb 240deg 300deg,#60a5fa 300deg 360deg)',
      }}
      aria-hidden
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-950 text-xs shadow-sm">
        🎡
      </span>
    </span>
  );
}

/** Live "4h 12m" until a task's cooldown lifts. */
function Cooldown({ iso, label }: { iso: string | null; label: string }) {
  const [left, setLeft] = useState('');

  useEffect(() => {
    if (!iso) return;
    const target = new Date(iso).getTime();
    const render = () => {
      const ms = target - Date.now();
      if (ms <= 0) return setLeft('');
      const m = Math.floor(ms / 60_000);
      setLeft(m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
    };
    render();
    const id = setInterval(render, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return <span className="tabular-nums">{left ? `${label} ${left}` : label}</span>;
}
