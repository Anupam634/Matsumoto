'use client';

import React, { useState } from 'react';
import type { AdminSupportTicket } from '../../../lib/admin-api';

interface SupportReplyModalProps {
  selected: AdminSupportTicket;
  onClose: () => void;
  onSubmitReply: (replyMessage: string) => Promise<void>;
}

export function SupportReplyModal({
  selected,
  onClose,
  onSubmitReply,
}: SupportReplyModalProps) {
  const [replyMessage, setReplyMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setBusy(true);
    try {
      await onSubmitReply(replyMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <form
        onSubmit={handleReply}
        className="card w-full max-w-lg border-slate-800 bg-slate-900 p-6"
      >
        <h3 className="text-lg font-black text-white">{selected.subject}</h3>
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {selected.messages?.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl p-3 text-xs leading-relaxed border ${
                m.fromAdmin
                  ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                {m.fromAdmin ? 'Operator' : 'Miner'}
              </div>
              {m.body}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold uppercase text-slate-400">
            Operator Reply
          </label>
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            rows={4}
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white outline-none focus:border-amber-500"
            placeholder="Type resolution reply to the miner…"
            required
          />
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-gold rounded-xl px-5 py-2 text-xs font-black uppercase text-slate-950"
          >
            {busy ? 'Sending…' : 'Send & Resolve'}
          </button>
        </div>
      </form>
    </div>
  );
}
