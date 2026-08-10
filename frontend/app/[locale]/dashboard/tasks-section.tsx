'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  QUIZ: '❓',
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
  const [spinningId, setSpinningId] = useState<string | null>(null);
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
    setBusyId(task.id);
    setError(null);

    // The wheel gets a moment to spin before the reward lands, so the
    // animation reads as the cause of the payout rather than an afterthought.
    const isWheel = task.type === 'SPIN_WHEEL';
    if (isWheel) setSpinningId(task.id);

    try {
      const [res] = await Promise.all([
        claimTask(task.id),
        isWheel ? new Promise((r) => setTimeout(r, 2200)) : Promise.resolve(),
      ]);
      setWon({ id: task.id, points: res.earnedPoints });
      setTimeout(() => setWon(null), 2000);
      await load();
      onClaimed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusyId(null);
      setSpinningId(null);
    }
  }

  if (!tasks) {
    return (
      <section className="panel mt-4 p-5">
        <div className="skeleton h-4 w-24" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="panel rise-in mt-4 p-5"
      style={{ '--i': 5 } as React.CSSProperties}
    >
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-bold">{t('tasksTitle')}</h2>
        <span className="text-sm text-slate-400">{t('tasksSubtitle')}</span>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            {won?.id === task.id && (
              <span className="float-up absolute left-1/2 top-2 z-10 whitespace-nowrap text-lg font-extrabold text-emerald-400">
                +{won.points.toFixed(2)}
              </span>
            )}

            <div className="flex items-start gap-3">
              {task.type === 'SPIN_WHEEL' ? (
                <SpinWheel spinning={spinningId === task.id} />
              ) : (
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-indigo-500/15 text-lg"
                  aria-hidden
                >
                  {ICON[task.type]}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {taskLabels(LABEL_KEY[task.type])}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-indigo-300">
                  +{task.rewardPoints} {t('pointsShort')}
                </div>
              </div>
            </div>

            <button
              onClick={() => claim(task)}
              disabled={!task.canClaim || busyId === task.id}
              className="btn-primary mt-3 w-full py-2 text-sm"
            >
              {busyId === task.id
                ? t('working')
                : task.canClaim
                  ? t('claim')
                  : <Cooldown iso={task.nextAvailableAt} label={t('cooldownShort')} />}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** A wheel that actually spins — decorative, the reward is server-set. */
function SpinWheel({ spinning }: { spinning: boolean }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${
        spinning ? 'wheel-spin' : ''
      }`}
      style={{
        background:
          'conic-gradient(#818cf8 0 60deg,#c7d2fe 60deg 120deg,#7c3aed 120deg 180deg,#c7d2fe 180deg 240deg,#2563eb 240deg 300deg,#c7d2fe 300deg 360deg)',
      }}
      aria-hidden
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs">
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
