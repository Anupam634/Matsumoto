'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface TaskItem {
  id: string;
  nameKey: 'tweet' | 'follow' | 'repost' | 'youtube' | 'quiz' | 'spin';
  reward: number;
  icon: string;
  category: 'Social' | 'Community' | 'Daily' | 'Knowledge';
}

const TASKS: TaskItem[] = [
  { id: 't1', nameKey: 'spin', reward: 500, icon: '🎡', category: 'Daily' },
  { id: 't2', nameKey: 'youtube', reward: 100, icon: '📺', category: 'Community' },
  { id: 't3', nameKey: 'quiz', reward: 75, icon: '🧠', category: 'Knowledge' },
  { id: 't4', nameKey: 'follow', reward: 50, icon: '🐦', category: 'Social' },
  { id: 't5', nameKey: 'tweet', reward: 50, icon: '💬', category: 'Social' },
  { id: 't6', nameKey: 'repost', reward: 50, icon: '🔄', category: 'Social' },
];

export function TasksBountySection({ locale }: { locale: string }) {
  const t = useTranslations('landing.tasksSection');
  const tTasks = useTranslations('tasks');
  const registerLink = `/${locale}/login?mode=register`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TASKS.map((task) => (
        <div
          key={task.id}
          className="glass-panel flex flex-col justify-between p-6 transition-all duration-300 hover:border-amber-400/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-2xl shadow-inner">
                {task.icon}
              </div>
              <div>
                <span className="rounded-md bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {task.category}
                </span>
                <h4 className="mt-1 font-extrabold text-slate-100 text-sm">
                  {tTasks(task.nameKey)}
                </h4>
              </div>
            </div>

            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-mono font-black text-amber-300 whitespace-nowrap">
              {t('rewardBadge', { amount: task.reward })}
            </span>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs">
            <span className="text-slate-400 font-medium">{t('instantCredit')}</span>
            <Link
              href={registerLink}
              className="font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              {t('actionButton')} →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
