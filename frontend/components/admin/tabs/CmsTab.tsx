'use client';

import React, { useState } from 'react';

export function CmsTab() {
  const [heroTitle, setHeroTitle] = useState('BONDKOIN Node Mining Protocol');
  const [heroSubtitle, setHeroSubtitle] = useState('Next-Generation BEP-20 Decentralized Mining Cluster');
  const [faqCount] = useState(12);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">📝 Content Management & Platform Pages</h2>
          <p className="text-xs text-slate-400">
            Manage landing copy, FAQ items, Terms of Service, and platform announcements
          </p>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-bold">
          ✓ Content updates published successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-5 md:grid-cols-2">
        <div className="card border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Hero Section Banner</h3>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400">Hero Main Title</label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400">Hero Subtitle</label>
            <input
              type="text"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white"
            />
          </div>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Platform Content Pages</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
              <span>FAQ Knowledge Base</span>
              <span className="font-bold text-amber-400">{faqCount} Questions Active</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
              <span>Terms of Service</span>
              <span className="text-emerald-400 font-bold">Published</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
              <span>Privacy Policy</span>
              <span className="text-emerald-400 font-bold">Published</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="btn-gold rounded-xl px-6 py-2.5 text-xs font-black uppercase text-slate-950">
            Publish Content Updates
          </button>
        </div>
      </form>
    </div>
  );
}
