'use client';

import React from 'react';
import type { AdminKycDetail } from '../../../lib/admin-api';

interface KycInspectModalProps {
  selected: AdminKycDetail;
  onClose: () => void;
  onDecide: (approve: boolean) => void;
}

export function KycInspectModal({
  selected,
  onClose,
  onDecide,
}: KycInspectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-lg font-black text-white">KYC Document Inspection</h3>
            <p className="text-xs text-slate-400">
              Applicant: {selected.fullName} ({selected.userEmail})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            ✕ Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {selected.documents?.map((doc, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-xs font-bold uppercase text-amber-400">
                {doc.kind} Document
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.dataUrl}
                alt={doc.kind}
                className="mt-2 h-48 w-full rounded-lg object-contain bg-black/50"
              />
            </div>
          ))}
        </div>

        {selected.status === 'PENDING' && (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              onClick={() => onDecide(false)}
              className="rounded-xl border border-red-500/40 bg-red-950/40 px-5 py-2.5 text-xs font-bold text-red-300"
            >
              ✕ Reject Applicant
            </button>
            <button
              onClick={() => onDecide(true)}
              className="btn-gold rounded-xl px-6 py-2.5 text-xs font-black uppercase text-slate-950"
            >
              ✓ Approve Identity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
