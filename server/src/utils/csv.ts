// server/src/utils/csv.ts
import type { Response } from 'express';

/** UTF-8 BOM so Excel opens Bengali text correctly. */
export const CSV_BOM = '\uFEFF';
const CRLF = '\r\n';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  if (typeof value === 'object') {
    // Firestore Timestamp (or anything Timestamp-like)
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      const d = maybe.toDate();
      return Number.isNaN(d.getTime()) ? '' : d.toISOString();
    }
    return JSON.stringify(value);
  }
  return String(value);
}

const PLAIN_NUMBER = /^[+-]?\d+(\.\d+)?$/;
const PHONE_LIKE = /^\+\d[\d\s-]*$/;
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Escapes one CSV cell. Strings that start with a spreadsheet formula
 * character are prefixed with an apostrophe (CSV injection guard); plain
 * numbers and phone numbers are left untouched.
 */
export function escapeCsvCell(value: unknown): string {
  let s = stringify(value);

  if (
    typeof value === 'string' &&
    FORMULA_START.test(s) &&
    !PLAIN_NUMBER.test(s) &&
    !PHONE_LIKE.test(s)
  ) {
    s = `'${s}`;
  }

  if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Builds a full CSV document (BOM + CRLF line endings). */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines: string[] = [columns.map((c) => escapeCsvCell(c.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvCell(c.value(row))).join(','));
  }
  return CSV_BOM + lines.join(CRLF) + CRLF;
}

function safeFilename(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'export';
  return cleaned.toLowerCase().endsWith('.csv') ? cleaned : `${cleaned}.csv`;
}

/** Sends a CSV download response. */
export function sendCsv<T>(
  res: Response,
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const file = safeFilename(filename);
  res.status(200);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=UTF-8''${encodeURIComponent(file)}`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(toCsv(columns, rows));
    }
