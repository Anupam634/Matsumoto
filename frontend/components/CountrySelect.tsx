'use client';

import { useMemo } from 'react';
import { countryOptions } from '../lib/countries';

/**
 * Every ISO 3166-1 country, named in the current UI language.
 *
 * A plain `<select>` rather than a custom combobox: it gets native
 * type-to-search on desktop and the OS wheel picker on mobile for free,
 * which beats anything hand-rolled at 255 options.
 */
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
  // Sorting 255 names through a collator is not free; the list only changes
  // when the language does.
  const options = useMemo(() => countryOptions(locale), [locale]);

  return (
    <label className="block" htmlFor={id}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        id={id}
        className="input-field mt-1.5"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
