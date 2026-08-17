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
          className="glass-panel group flex flex-col justify-between p-6 transition-all duration-300 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600/15 border border-blue-500/30 text-2xl shadow-inner transition-transform group-hover:scale-105">
                  {task.icon}
                </div>
                <div>
                  <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-300">
                    {task.category}
                  </span>
                  <h4 className="mt-1 font-black text-white text-sm tracking-tight group-hover:text-blue-200 transition-colors">
                    {tTasks(task.nameKey)}
                  </h4>
                </div>
              </div>

              <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 text-xs font-mono font-black text-cyan-300 whitespace-nowrap shadow-sm">
                {t('rewardBadge', { amount: task.reward })}
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs">
            <span className="text-slate-400 font-medium">{t('instantCredit')}</span>
            <Link
              href={registerLink}
              className="btn-brand inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <span>✨</span>
              <span>{t('actionButton')}</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
