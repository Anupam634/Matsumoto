'use client';

import React, { useState, useEffect } from 'react';
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
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);

  const docs = selected.documents ?? [];
  const currentDoc = fullscreenIndex !== null ? docs[fullscreenIndex] : null;

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

          {/* Action Buttons for Pending State */}
          {selected.status === 'PENDING' && (
            <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => onDecide(false)}
                className="rounded-xl border border-red-500/40 bg-red-950/40 px-5 py-2.5 text-xs font-bold text-red-300 hover:bg-red-900/60 transition"
              >
                ✕ Reject Applicant
              </button>
              <button
                onClick={() => onDecide(true)}
                className="btn-gold rounded-xl px-6 py-2.5 text-xs font-black uppercase text-slate-950 shadow-lg shadow-amber-500/20"
              >
                ✓ Approve Identity
              </button>
            </div>
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
