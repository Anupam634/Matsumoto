'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

export function FAQSection() {
  const t = useTranslations('landing.faq');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {FAQ_KEYS.map((key, idx) => {
        const isOpen = openIndex === idx;
        const qKey = `q${idx + 1}` as const;
        const aKey = `a${idx + 1}` as const;

        return (
          <div
            key={key}
            className="card overflow-hidden transition-all duration-300 hover:border-slate-700"
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-900/40"
            >
              <span className="font-semibold text-slate-100 sm:text-base pr-4">
                {t(qKey)}
              </span>
              <span
                className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-800 text-sm font-bold text-amber-400 transition-transform duration-300 ${
                  isOpen ? 'rotate-180 bg-amber-500/20 border-amber-500/40' : ''
                }`}
              >
                ↓
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-slate-800/80 bg-slate-950/60 p-5 text-sm leading-relaxed text-slate-300">
                {t(aKey)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
