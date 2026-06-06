/**
 * csv.ts — tiny CSV exporter used by Transactions, Invoices, and any other
 * tabular page that needs a "Download CSV" button.
 *
 * Client-side only — no backend involvement. Builds an RFC-4180-ish CSV
 * (commas, double-quote escape) and triggers a browser download via a
 * temporary <a download="">. Caller passes:
 *   - filename: "transactions-2026-05-19.csv"
 *   - columns:  array of { header, accessor }
 *   - rows:     array of objects
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Escape a single cell value per RFC 4180:
 *   - wrap in double quotes if it contains comma, quote, CR, or LF
 *   - replace embedded double quotes with two double quotes
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(',');
  const bodyLines = rows.map((row) =>
    columns.map((c) => escapeCell(c.accessor(row))).join(','),
  );
  // \r\n line ending is the spec-correct CSV separator — many older
  // spreadsheet tools require it.
  return [headerLine, ...bodyLines].join('\r\n');
}

export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  // BOM prefix makes Excel open UTF-8 files (e.g. ₦ symbol) correctly.
  const csv = '﻿' + buildCsv(columns, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has a moment to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Timestamp suffix safe for filenames: 2026-05-19_143012 */
export function csvTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    '_' + pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}
