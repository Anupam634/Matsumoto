'use client';

import React, { useState, useEffect } from 'react';
import type { AdminKycDetail } from '../../../lib/admin-api';

interface KycInspectModalProps {
  selected: AdminKycDetail;
  onClose: () => void;
  onDecide: (approve: boolean, note?: string) => Promise<void>;
}

export function KycInspectModal({
  selected,
  onClose,
  onDecide,
}: KycInspectModalProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);

  // Custom Decision State (Replaces browser prompt)
  const [decisionType, setDecisionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewerNote, setReviewerNote] = useState<string>('Verified & Valid Government ID');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const docs = selected.documents ?? [];
  const currentDoc = fullscreenIndex !== null ? docs[fullscreenIndex] : null;

  const approvalPresets = [
    'Verified & Valid Government ID',
    'Passport Details Cleared',
    'National Identity Card Cleared',
    'Manual Operator Fast-Track',
  ];

  const rejectionPresets = [
    'Document photo unreadable or blurry',
    'Full legal name does not match document',
    'Expired document presented',
    'Selfie does not match photo on document',
    'Suspected digital alteration',
  ];

  // Sync preset note when switching decision type
  function selectDecision(type: 'APPROVE' | 'REJECT') {
    setDecisionType(type);
    if (type === 'APPROVE') {
      setReviewerNote(approvalPresets[0]);
    } else {
      setReviewerNote(rejectionPresets[0]);
    }
  }

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (fullscreenIndex !== null) {
          setFullscreenIndex(null);
          setRotation(0);
          setZoom(1);
        } else {
          onClose();
        }
      } else if (fullscreenIndex !== null) {
        if (e.key === 'ArrowRight') {
          setFullscreenIndex((prev) =>
            prev !== null && prev < docs.length - 1 ? prev + 1 : 0,
          );
          setRotation(0);
          setZoom(1);
        } else if (e.key === 'ArrowLeft') {
          setFullscreenIndex((prev) =>
            prev !== null && prev > 0 ? prev - 1 : docs.length - 1,
          );
          setRotation(0);
          setZoom(1);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenIndex, docs.length, onClose]);

  function openFullscreen(idx: number) {
    setFullscreenIndex(idx);
    setRotation(0);
    setZoom(1);
  }

  function closeFullscreen() {
    setFullscreenIndex(null);
    setRotation(0);
    setZoom(1);
  }

  async function handleSubmitDecision(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onDecide(decisionType === 'APPROVE', reviewerNote.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
        <div className="card max-h-[92vh] w-full max-w-4xl overflow-y-auto border-slate-800 bg-slate-900 p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">
                  🪪 KYC Document Inspection
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                    selected.status === 'APPROVED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : selected.status === 'PENDING'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}
                >
                  {selected.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Applicant: <strong className="text-white">{selected.fullName || 'Unnamed'}</strong> ({selected.userEmail})
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              ✕ Close
            </button>
          </div>

          {/* Applicant Metadata Summary */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-[10px] font-sans font-bold uppercase text-slate-500">Legal Name</div>
              <div className="mt-1 font-bold text-white truncate font-sans">{selected.fullName ?? '—'}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-[10px] font-sans font-bold uppercase text-slate-500">Document Type</div>
              <div className="mt-1 font-bold text-amber-400">{selected.documentType ?? 'National ID'}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-[10px] font-sans font-bold uppercase text-slate-500">Document Number</div>
              <div className="mt-1 font-bold text-cyan-400 truncate">{selected.documentNumber ?? '—'}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-[10px] font-sans font-bold uppercase text-slate-500">Country / Region</div>
              <div className="mt-1 font-bold text-slate-200">{selected.countryCode ?? 'Global'}</div>
            </div>
          </div>

          {/* Document Images Grid with Click-to-Expand */}
          <div className="mt-6">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Uploaded Verification Media ({docs.length} Documents)
              </span>
              <span className="text-[11px] text-amber-400 font-bold">
                💡 Click any image to open full size
              </span>
            </div>

            {docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-12 text-center text-xs text-slate-500">
                No identity document images found for this applicant.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-3 transition hover:border-amber-500/50"
                  >
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-xs font-black uppercase text-amber-400">
                        {doc.kind === 'front'
                          ? '📄 Front Document'
                          : doc.kind === 'back'
                          ? '📄 Back Document'
                          : '🤳 Selfie with ID'}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        #{idx + 1} of {docs.length}
                      </span>
                    </div>

                    {/* Thumbnail Image with Hover Overlay */}
                    <div
                      onClick={() => openFullscreen(idx)}
                      className="relative h-52 w-full cursor-zoom-in overflow-hidden rounded-xl bg-slate-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.dataUrl}
                        alt={`${doc.kind} verification`}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                        <span className="rounded-xl border border-white/20 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-2xl">
                          🔍 Click to View Full Size
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openFullscreen(idx)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 py-2 text-xs font-bold text-slate-300 transition hover:border-amber-500 hover:text-amber-400"
                    >
                      <span>🔍</span>
                      <span>Open Full Image</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ───────────────── Sleek In-Modal Verification Verdict Panel ───────────────── */}
          {selected.status === 'PENDING' ? (
            <form
              onSubmit={handleSubmitDecision}
              className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    ⚖️ Identity Review Decision
                  </h4>
                  <p className="text-xs text-slate-400">
                    Select verdict and provide reviewer notes (logged on-chain and sent to applicant)
                  </p>
                </div>

                {/* Verdict Choice Switcher */}
                <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => selectDecision('APPROVE')}
                    className={`rounded-lg px-4 py-2 font-black uppercase transition ${
                      decisionType === 'APPROVE'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    ✓ Approve Identity
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDecision('REJECT')}
                    className={`rounded-lg px-4 py-2 font-black uppercase transition ${
                      decisionType === 'REJECT'
                        ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                        : 'text-slate-400 hover:text-red-400'
                    }`}
                  >
                    ✕ Reject Applicant
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  Quick Note Presets ({decisionType === 'APPROVE' ? 'Approval' : 'Rejection Reasons'})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(decisionType === 'APPROVE' ? approvalPresets : rejectionPresets).map(
                    (preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setReviewerNote(preset)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          reviewerNote === preset
                            ? decisionType === 'APPROVE'
                              ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                              : 'border-red-500 bg-red-950/60 text-red-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Reviewer Note Input */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Reviewer Note & Audit Trail
                </label>
                <input
                  type="text"
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder={
                    decisionType === 'APPROVE'
                      ? 'e.g. Verified & Clear passport'
                      : 'e.g. Document unreadable / Name mismatch'
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                    decisionType === 'APPROVE'
                      ? 'btn-gold text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20'
                  } disabled:opacity-50`}
                >
                  {submitting
                    ? 'Submitting Verdict…'
                    : decisionType === 'APPROVE'
                    ? '✓ Confirm & Approve Identity'
                    : '✕ Confirm Rejection'}
                </button>
              </div>
            </form>
          ) : (
            selected.reviewerNote && (
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Recorded Reviewer Audit Note
                </div>
                <div className="mt-1 text-xs text-slate-200">{selected.reviewerNote}</div>
              </div>
            )
          )}
        </div>
      </div>

      {/* ───────────────── Full Screen Lightbox Modal ───────────────── */}
      {currentDoc && fullscreenIndex !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl">
          {/* Lightbox Top Control Bar */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-amber-500 px-2 py-0.5 text-xs font-black uppercase text-slate-950">
                {currentDoc.kind} Document
              </span>
              <span className="text-sm font-bold text-white">
                {selected.fullName} ({selected.userEmail})
              </span>
              <span className="text-xs font-mono text-slate-400">
                ({fullscreenIndex + 1} / {docs.length})
              </span>
            </div>

            {/* Controls (Rotate, Zoom, Download, Close) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white"
                title="Zoom Out"
              >
                ➖ Zoom Out
              </button>
              <span className="font-mono text-xs text-slate-300 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white"
                title="Zoom In"
              >
                ➕ Zoom In
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white"
                title="Rotate 90°"
              >
                🔄 Rotate 90°
              </button>
              <a
                href={currentDoc.dataUrl}
                download={`kyc_${selected.fullName || 'doc'}_${currentDoc.kind}.jpg`}
                className="rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white"
              >
                💾 Download
              </a>
              <button
                onClick={closeFullscreen}
                className="ml-4 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
              >
                ✕ Close (ESC)
              </button>
            </div>
          </div>

          {/* Lightbox Center Image Viewport */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
            {/* Previous Document Button */}
            {docs.length > 1 && (
              <button
                onClick={() =>
                  openFullscreen(
                    fullscreenIndex > 0 ? fullscreenIndex - 1 : docs.length - 1,
                  )
                }
                className="absolute left-6 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-slate-900/80 text-xl font-bold text-white shadow-2xl hover:bg-amber-500 hover:text-slate-950 transition"
                title="Previous Document (Left Arrow)"
              >
                ‹
              </button>
            )}

            {/* Next Document Button */}
            {docs.length > 1 && (
              <button
                onClick={() =>
                  openFullscreen(
                    fullscreenIndex < docs.length - 1 ? fullscreenIndex + 1 : 0,
                  )
                }
                className="absolute right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-slate-900/80 text-xl font-bold text-white shadow-2xl hover:bg-amber-500 hover:text-slate-950 transition"
                title="Next Document (Right Arrow)"
              >
                ›
              </button>
            )}

            {/* Displayed Image */}
            <div className="flex h-full w-full items-center justify-center overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentDoc.dataUrl}
                alt={`${currentDoc.kind} full view`}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl select-none"
              />
            </div>
          </div>

          {/* Lightbox Bottom Thumbnail Strip */}
          <div className="flex h-20 shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-slate-950 px-4">
            {docs.map((doc, idx) => (
              <button
                key={doc.id || idx}
                onClick={() => openFullscreen(idx)}
                className={`relative h-14 w-20 overflow-hidden rounded-lg border-2 transition ${
                  idx === fullscreenIndex
                    ? 'border-amber-500 scale-105'
                    : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.dataUrl}
                  alt={doc.kind}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
