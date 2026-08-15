'use client';

import { useMemo } from 'react';
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
  const options = useMemo(() => countryOptions(locale), [locale]);

  return (
    <label className="block" htmlFor={id}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <select
        id={id}
        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled className="bg-slate-950 text-slate-500">
          {placeholder}
        </option>
        {options.map((c) => (
          <option key={c.code} value={c.code} className="bg-slate-950 text-slate-100">
            {c.flag} {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
