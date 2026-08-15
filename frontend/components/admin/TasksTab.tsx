'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  listAdminTasks,
  updateAdminTask,
  ApiError,
  type AdminTaskItem,
} from '../../lib/admin-api';
import { FullTaskEditorModal } from './modals/FullTaskEditorModal';

interface TasksTabProps {
  onUnauthorized: () => void;
}

export function TasksTab({ onUnauthorized }: TasksTabProps) {
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [editTask, setEditTask] = useState<AdminTaskItem | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listAdminTasks();
      setTasks(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveTask(dto: any) {
    if (!editTask) return;
    try {
      await updateAdminTask(editTask.id, dto);
      setEditTask(null);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Task update failed.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">
            Dynamic Tasks & Bounties Configuration
          </h2>
          <p className="text-xs text-slate-400">
            Full visual management for Web3 Quiz questions, Lucky Wheel slices, and Social Media engagement bounties
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-300">
                  {task.type}
                </span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  +{task.rewardPoints} PTS
                </span>
              </div>
              <h3 className="mt-3 text-base font-bold text-white">{task.title}</h3>
              <p className="mt-1 text-xs text-slate-400">
                Cooldown: <strong className="text-slate-200">{task.cooldownHours}h</strong> • Status:{' '}
                <span
                  className={`font-bold ${
                    task.active ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {task.active ? 'Active' : 'Disabled'}
                </span>
              </p>

              {task.type === 'QUIZ' && task.quizQuestions && (
                <div className="mt-3 rounded-lg bg-slate-950 p-2.5 text-[11px] text-slate-400 border border-slate-800">
                  🧠 <strong>{task.quizQuestions.length} Questions</strong> configured
                </div>
              )}

              {task.type === 'SPIN_WHEEL' && task.wheelSegments && (
                <div className="mt-3 rounded-lg bg-slate-950 p-2.5 text-[11px] text-slate-400 border border-slate-800">
                  🎡 <strong>{task.wheelSegments.length} Slices</strong>: [
                  {task.wheelSegments.join(', ')}] PTS
                </div>
              )}

              {task.actionUrl && (
                <div className="mt-3 truncate rounded-lg bg-slate-950 p-2.5 text-[11px] text-slate-400 border border-slate-800">
                  🔗 <span className="font-mono text-cyan-400">{task.actionUrl}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setEditTask(task)}
              className="btn-gold mt-5 w-full rounded-xl py-2.5 text-xs font-black uppercase text-slate-950 shadow-md"
            >
              ⚙️ Full Task Editor →
            </button>
          </div>
        ))}
      </div>

      {editTask && (
        <FullTaskEditorModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}
