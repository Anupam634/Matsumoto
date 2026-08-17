'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '../i18n';

interface LocaleOption {
  code: string;
  label: string;
  shortLabel: string;
  flag: string;
}

const LOCALE_OPTIONS: Record<string, LocaleOption> = {
  en: { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
  zh: { code: 'zh', label: '简体中文', shortLabel: '中文', flag: '🇨🇳' },
  ko: { code: 'ko', label: '한국어', shortLabel: '한국어', flag: '🇰🇷' },
};

export function LocaleSwitcher({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = LOCALE_OPTIONS[locale] || {
    code: locale,
    label: locale.toUpperCase(),
    shortLabel: locale.toUpperCase(),
    flag: '🌐',
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  function switchTo(next: string) {
    setOpen(false);
    if (next === locale) return;
    const rest = pathname.split('/').slice(2).join('/');
    const search = typeof window === 'undefined' ? '' : window.location.search;
    router.replace(`/${next}${rest ? `/${rest}` : ''}${search}`);
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/80 px-2.5 text-xs font-bold text-slate-200 shadow-sm backdrop-blur-md transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white"
        aria-expanded={open}
        aria-label="Select Language"
      >
        <span className="text-sm">{current.flag}</span>
        <span className="font-semibold">{current.shortLabel}</span>
        <span className="text-[10px] text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 origin-top-right rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Language
          </div>
          <div className="space-y-0.5">
            {locales.map((code) => {
              const opt = LOCALE_OPTIONS[code] || {
                code,
                label: code.toUpperCase(),
                shortLabel: code.toUpperCase(),
                flag: '🌐',
              };
              const isSelected = locale === code;

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => switchTo(code)}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{opt.flag}</span>
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <span className="text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
