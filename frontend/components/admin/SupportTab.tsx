'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  listSupport,
  replySupport,
  ApiError,
  type AdminSupportTicket,
} from '../../lib/admin-api';
import { SupportReplyModal } from './modals/SupportReplyModal';

interface SupportTabProps {
  onUnauthorized: () => void;
}

export function SupportTab({ onUnauthorized }: SupportTabProps) {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [selected, setSelected] = useState<AdminSupportTicket | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listSupport();
      setTickets(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReply(replyMessage: string) {
    if (!selected) return;
    try {
      await replySupport(selected.id, replyMessage, 'ANSWERED');
      setSelected(null);
      load();
    } catch {
      alert('Failed to send operator reply.');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-white">Customer Support Tickets</h2>
      <div className="card overflow-hidden border-slate-800 bg-slate-900/80">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-white/[0.08] bg-slate-950/80 font-bold uppercase text-slate-400">
            <tr>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Subject</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No support tickets filed.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 text-slate-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 font-bold text-white">{t.userEmail}</td>
                  <td className="p-3.5 text-slate-200">{t.subject}</td>
                  <td className="p-3.5 font-bold text-amber-400">{t.status}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setSelected(t)}
                      className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1 text-xs font-bold text-amber-300"
                    >
                      Reply
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <SupportReplyModal
          selected={selected}
          onClose={() => setSelected(null)}
          onSubmitReply={handleReply}
        />
      )}
    </div>
  );
}
