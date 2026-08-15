'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'cyber';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('matsumoto_theme') as ThemeMode;
    if (saved && (saved === 'dark' || saved === 'light' || saved === 'cyber')) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-cyber');
    root.classList.add(`theme-${mode}`);
    localStorage.setItem('matsumoto_theme', mode);
  };

  const handleSelect = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
  };

  if (!mounted) {
    return (
      <div className="h-8 w-24 rounded-full border border-white/10 bg-slate-900/60 animate-pulse" />
    );
  }

  return (
    <div className="flex items-center rounded-full border border-white/15 bg-slate-900/80 p-0.5 backdrop-blur-md shadow-sm">
      <button
        type="button"
        title="Dark Mode"
        aria-label="Dark Mode"
        onClick={() => handleSelect('dark')}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
          theme === 'dark'
            ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        🌙
      </button>

      <button
        type="button"
        title="Light Mode"
        aria-label="Light Mode"
        onClick={() => handleSelect('light')}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
          theme === 'light'
            ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        ☀️
      </button>

      <button
        type="button"
        title="Cyber Gold Mode"
        aria-label="Cyber Gold Mode"
        onClick={() => handleSelect('cyber')}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
          theme === 'cyber'
            ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-bold shadow-md shadow-yellow-500/30'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        ⚡
      </button>
    </div>
  );
}
