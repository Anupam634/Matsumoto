'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { countryOptions } from '../lib/countries';

export function CountrySelect({
  value,
  onChange,
  locale,
  label,
  placeholder,
  required,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  locale: string;
  label: string;
  placeholder: string;
  required?: boolean;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => countryOptions(locale), [locale]);

  const selectedCountry = useMemo(
    () => options.find((c) => c.code.toLowerCase() === value.toLowerCase()),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative block" ref={containerRef}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="text-amber-500 ml-1">*</span>}
      </span>

      {/* Hidden input for form requirement validation */}
      <input
        type="text"
        id={id}
        name="countryCode"
        value={value}
        required={required}
        onChange={() => {}}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-left text-sm text-slate-100 outline-none transition-all hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {selectedCountry ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                alt={selectedCountry.code}
                width={22}
                height={16}
                className="h-4 w-6 rounded object-cover shadow-sm flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="truncate font-medium text-slate-100">
                {selectedCountry.name}
              </span>
              <span className="font-mono text-xs font-semibold text-amber-400/80">
                ({selectedCountry.code})
              </span>
            </>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>

        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/95 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="border-b border-slate-800 p-2.5 bg-slate-900/60">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                🔍
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* List of Countries */}
          <div className="max-h-52 overflow-y-auto p-1 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-500">No country found</div>
            ) : (
              filteredOptions.map((c) => {
                const isSelected = c.code.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c.code)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                        alt={c.code}
                        width={20}
                        height={14}
                        className="h-3.5 w-5 rounded object-cover shadow-sm flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-500 ml-2">
                      {c.code}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
