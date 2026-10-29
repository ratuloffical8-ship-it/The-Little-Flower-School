// src/features/admin/students/ImportStudentsModal.tsx
import { useMemo, useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi } from '../../../hooks/useApi';

interface ClassOption {
  id: string;
  nameBn: string;
  nameEn: string;
  order?: number;
}

interface ImportStudentsModalProps {
  classes: ClassOption[];
  onClose: () => void;
  onFinished: () => void;
}

interface ParsedRow {
  rowNumber: number;
  name: string;
  classId: string;
  roll?: number;
  guardianName: string;
  guardianMobile: string;
  guardianRelation?: string;
  guardianAddress?: string;
  guardianNid?: string;
  guardianEmail?: string;
}

interface RowError {
  rowNumber: number;
  message: string;
}

interface ImportResult {
  rowNumber: number;
  status: 'created' | 'failed';
  message?: string;
  studentId?: string;
}

const REQUIRED_HEADERS = ['name', 'classId', 'guardianName', 'guardianMobile'];
const OPTIONAL_HEADERS = [
  'roll',
  'guardianRelation',
  'guardianAddress',
  'guardianNid',
  'guardianEmail',
];
const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

const MAX_ROWS = 200;

function isValidBdMobile(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, '');
  return /^(?:\+?880|0)1[3-9]\d{8}$/.test(digits);
}

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

// Minimal CSV parser: handles quoted fields, escaped quotes ("") and CRLF.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const push = () => {
    cur.push(field);
    field = '';
  };
  const endRow = () => {
    cur.push(field);
    field = '';
    rows.push(cur);
    cur = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      push();
      i++;
      continue;
    }
    if (ch === '\r') {
      // handle CRLF or lone CR
      if (text[i + 1] === '\n') {
        endRow();
        i += 2;
      } else {
        endRow();
        i++;
      }
      continue;
    }
    if (ch === '\n') {
      endRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // last field / row
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  // drop trailing fully-empty rows
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === '')) {
    rows.pop();
  }
  return rows;
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export default function ImportStudentsModal({
  classes,
  onClose,
  onFinished,
}: ImportStudentsModalProps) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const createApi = useApi<{ success: boolean; item?: { studentId?: string } }>('POST');

  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const classIds = useMemo(() => new Set(classes.map((c) => c.id)), [classes]);

  const summary = useMemo(() => {
    if (results.length === 0) return null;
    const created = results.filter((r) => r.status === 'created').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    return { created, failed };
  }, [results]);

  function reset() {
    setParseError(null);
    setRows([]);
    setRowErrors([]);
    setResults([]);
    setProgress(null);
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setParseError(tr('শুধুমাত্র CSV ফাইল সমর্থিত।', 'Only CSV files are supported.'));
      return;
    }
    if (file.size > 1024 * 1024) {
      setParseError(tr('ফাইল ১ MB-এর বেশি হতে পারবে না।', 'File must be 1 MB or less.'));
      return;
    }

    let text: string;
    try {
      text = stripBom(await file.text());
    } catch {
      setParseError(tr('ফাইল পড়া যায়নি।', 'Could not read the file.'));
      return;
    }

    const matrix = parseCsv(text);
    if (matrix.length < 2) {
      setParseError(
        tr(
          'হেডার সহ অন্তত একটি সারি দরকার।',
          'At least one data row (plus the header) is required.',
        ),
      );
      return;
    }

    const header = matrix[0].map((h) => h.trim());
    const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
    if (missing.length > 0) {
      setParseError(
        tr(
          `প্রয়োজনীয় কলাম নেই: ${missing.join(', ')}`,
          `Missing required columns: ${missing.join(', ')}`,
        ),
      );
      return;
    }
    const unknown = header.filter((h) => h && !ALL_HEADERS.includes(h));
    if (unknown.length > 0) {
      setParseError(
        tr(
          `অজানা কলাম: ${unknown.join(', ')}`,
          `Unknown columns: ${unknown.join(', ')}`,
        ),
      );
      return;
    }

    const dataRows = matrix.slice(1);
    if (dataRows.length > MAX_ROWS) {
      setParseError(
        tr(
          `একবারে সর্বোচ্চ ${MAX_ROWS} সারি অনুমোদিত।`,
          `A maximum of ${MAX_ROWS} rows per import is allowed.`,
        ),
      );
      return;
    }

    const idx = (name: string) => header.indexOf(name);
    const parsed: ParsedRow[] = [];
    const errs: RowError[] = [];

    dataRows.forEach((cols, i) => {
      const rowNumber = i + 2; // header is row 1
      const cell = (name: string) => (cols[idx(name)] ?? '').trim();
      const isEmpty = cols.every((c) => c.trim() === '');
      if (isEmpty) return;

      const name = cell('name');
      const classId = cell('classId');
      const rollRaw = cell('roll');
      const guardianName = cell('guardianName');
      const guardianMobile = cell('guardianMobile');
      const guardianRelation = cell('guardianRelation');
      const guardianAddress = cell('guardianAddress');
      const guardianNid = cell('guardianNid');
      const guardianEmail = cell('guardianEmail');

      if (!name) {
        errs.push({ rowNumber, message: tr('নাম আবশ্যক।', 'Name is required.') });
        return;
      }
      if (name.length > 100) {
        errs.push({
          rowNumber,
          message: tr('নাম ১০০ অক্ষরের বেশি।', 'Name is longer than 100 chars.'),
        });
        return;
      }
      if (!classId) {
        errs.push({
          rowNumber,
          message: tr('শ্রেণি আবশ্যক।', 'classId is required.'),
        });
        return;
      }
      if (!classIds.has(classId)) {
        errs.push({
          rowNumber,
          message: tr(
            `অবৈধ শ্রেণি: ${classId}`,
            `Invalid classId: ${classId}`,
          ),
        });
        return;
      }
      let roll: number | undefined;
      if (rollRaw) {
        const n = Number(rollRaw);
        if (!Number.isInteger(n) || n < 1 || n > 999) {
          errs.push({
            rowNumber,
            message: tr(
              'রোল ১-৯৯৯ হতে হবে।',
              'roll must be between 1 and 999.',
            ),
          });
          return;
        }
        roll = n;
      }
      if (!guardianName) {
        errs.push({
          rowNumber,
          message: tr(
            'অভিভাবকের নাম আবশ্যক।',
            'guardianName is required.',
          ),
        });
        return;
      }
      if (!guardianMobile) {
        errs.push({
          rowNumber,
          message: tr(
            'অভিভাবকের মোবাইল আবশ্যক।',
            'guardianMobile is required.',
          ),
        });
        return;
      }
      if (!isValidBdMobile(guardianMobile)) {
        errs.push({
          rowNumber,
          message: tr(
            'বৈধ বাংলাদেশি মোবাইল নয়।',
            'guardianMobile is not a valid BD number.',
          ),
        });
        return;
      }
      if (guardianEmail && !isValidEmail(guardianEmail)) {
        errs.push({
          rowNumber,
          message: tr('বৈধ ইমেইল নয়।', 'guardianEmail is not valid.'),
        });
        return;
      }

      parsed.push({
        rowNumber,
        name,
        classId,
        roll,
        guardianName,
        guardianMobile,
        guardianRelation: guardianRelation || undefined,
        guardianAddress: guardianAddress || undefined,
        guardianNid: guardianNid || undefined,
        guardianEmail: guardianEmail || undefined,
      });
    });

    setRows(parsed);
    setRowErrors(errs);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setResults([]);
    setProgress({ done: 0, total: rows.length });
    const out: ImportResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const guardian: Record<string, string> = {
        name: r.guardianName,
        mobile: r.guardianMobile,
      };
      if (r.guardianRelation) guardian.relation = r.guardianRelation;
      if (r.guardianAddress) guardian.address = r.guardianAddress;
      if (r.guardianNid) guardian.nid = r.guardianNid;
      if (r.guardianEmail) guardian.email = r.guardianEmail;

      const payload: Record<string, unknown> = {
        name: r.name,
        classId: r.classId,
        guardian,
      };
      if (r.roll != null) payload.roll = r.roll;

      try {
        const res = await createApi.execute('/api/students', payload);
        out.push({
          rowNumber: r.rowNumber,
          status: 'created',
          studentId: res?.item?.studentId,
        });
      } catch (err) {
        out.push({
          rowNumber: r.rowNumber,
          status: 'failed',
          message:
            err instanceof Error
              ? err.message
              : tr('তৈরি ব্যর্থ হয়েছে।', 'Create failed.'),
        });
      }
      setProgress({ done: i + 1, total: rows.length });
    }
    setResults(out);
    setImporting(false);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (importing) return;
    if (e.target === e.currentTarget) onClose();
  }

  function handleClose() {
    if (importing) return;
    if (summary && summary.created > 0) onFinished();
    else onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={tr('শিক্ষার্থী ইমপোর্ট', 'Import students')}
    >
      <div className="card my-8 w-full max-w-3xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">
            {tr('শিক্ষার্থী ইমপোর্ট (CSV)', 'Import students (CSV)')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="text-ink/50 hover:text-ink disabled:opacity-40"
            aria-label={tr('বন্ধ করুন', 'Close')}
          >
            ✕
          </button>
        </div>

        <div className="rounded bg-surface p-3 text-sm text-ink/80">
          <p className="font-medium text-navy">
            {tr('প্রয়োজনীয় কলাম', 'Required columns')}:{' '}
            <span className="font-mono text-xs">
              {REQUIRED_HEADERS.join(', ')}
            </span>
          </p>
          <p className="mt-1">
            {tr('ঐচ্ছিক কলাম', 'Optional columns')}:{' '}
            <span className="font-mono text-xs">
              {OPTIONAL_HEADERS.join(', ')}
            </span>
          </p>
          <p className="mt-2 text-xs text-ink/70">
            {tr(
              `সর্বোচ্চ ${MAX_ROWS} সারি · UTF-8 এনকোডিং · classId হতে হবে বৈধ শ্রেণির আইডি (যেমন play, nursery, 1-10)।`,
              `Max ${MAX_ROWS} rows · UTF-8 encoding · classId must be a valid class ID (e.g., play, nursery, 1–10).`,
            )}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="csv-file">
            {tr('CSV ফাইল নির্বাচন করুন', 'Choose CSV file')}
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            disabled={importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="input-field"
          />
          {fileName && (
            <p className="mt-1 text-xs text-ink/60">{fileName}</p>
          )}
        </div>

        {parseError && (
          <div className="rounded border-l-4 border-l-red-600 bg-red-50 p-3 text-sm text-red-700">
            {parseError}
          </div>
        )}

        {rowErrors.length > 0 && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">
              {tr(
                `${rowErrors.length}টি সারি উপেক্ষা করা হবে`,
                `${rowErrors.length} row(s) will be skipped`,
              )}
            </p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-900">
              {rowErrors.map((e) => (
                <li key={e.rowNumber}>
                  {tr('সারি', 'Row')} {e.rowNumber}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rows.length > 0 && !summary && (
          <div className="rounded border border-surface p-3 text-sm">
            <p className="font-medium text-navy">
              {tr(
                `${rows.length}টি সারি ইমপোর্টের জন্য প্রস্তুত`,
                `${rows.length} row(s) ready to import`,
              )}
            </p>
            {progress && (
              <p className="mt-1 text-xs text-ink/70">
                {tr('অগ্রগতি', 'Progress')}: {progress.done} / {progress.total}
              </p>
            )}
          </div>
        )}

        {summary && (
          <div className="rounded border border-surface p-3 text-sm">
            <p className="font-medium text-navy">
              {tr('ইমপোর্ট সম্পন্ন', 'Import finished')}
            </p>
            <p className="mt-1 text-xs text-ink/70">
              {tr('সফল', 'Created')}: {summary.created} ·{' '}
              {tr('ব্যর্থ', 'Failed')}: {summary.failed}
            </p>
            {summary.failed > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
                {results
                  .filter((r) => r.status === 'failed')
                  .map((r) => (
                    <li key={r.rowNumber}>
                      {tr('সারি', 'Row')} {r.rowNumber}:{' '}
                      {r.message ?? tr('অজানা ত্রুটি', 'Unknown error')}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-surface pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            {summary ? tr('বন্ধ করুন', 'Close') : tr('বাতিল', 'Cancel')}
          </button>
          {!summary && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || rows.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {importing
                ? tr('ইমপোর্ট হচ্ছে…', 'Importing…')
                : tr(
                    `${rows.length} সারি ইমপোর্ট করুন`,
                    `Import ${rows.length} row(s)`,
                  )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
  }
