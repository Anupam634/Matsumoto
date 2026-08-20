'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'cyber' | 'red';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('matsumoto_theme') as ThemeMode;
    if (saved && (saved === 'dark' || saved === 'light' || saved === 'cyber' || saved === 'red')) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-cyber', 'theme-red', 'dark');
    root.classList.add(`theme-${mode}`);
    if (mode !== 'light') {
      root.classList.add('dark');
    }
    localStorage.setItem('matsumoto_theme', mode);
  };

  const handleSelect = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
  };

  if (!mounted) {
    return (
      <div className="h-8 w-32 rounded-full border border-white/10 bg-slate-900/60 animate-pulse" />
    );
  }

  return (
    <div className="flex items-center rounded-full border border-white/15 bg-slate-900/80 p-0.5 backdrop-blur-md shadow-sm">
      <button
        type="button"
        title="Midnight Sapphire"
        aria-label="Midnight Sapphire"
        onClick={() => handleSelect('dark')}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
          theme === 'dark'
            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        🌙
      </button>

      <button
        type="button"
        title="Executive Light"
        aria-label="Executive Light"
        onClick={() => handleSelect('light')}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
          theme === 'light'
            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        ☀️
      </button>

      <button
        type="button"
        title="Corporate Royal Blue"
        aria-label="Corporate Royal Blue"
        onClick={() => handleSelect('cyber')}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
          theme === 'cyber'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-indigo-500/30'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        🔵
      </button>

      <button
        type="button"
        title="Crimson Scarlet Red Edition"
        aria-label="Crimson Scarlet Red Edition"
        onClick={() => handleSelect('red')}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
          theme === 'red'
            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-md shadow-red-500/40 ring-1 ring-red-400'
            : 'text-slate-400 hover:text-rose-400'
        }`}
      >
        🔴
      </button>
    </div>
  );
}
