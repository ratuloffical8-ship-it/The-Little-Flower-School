// src/features/admin/reports/ReportsPage.tsx
import { useState, type ReactNode } from 'react';
import { useApiGet } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import StatCard from '../common/StatCard';
import ChartCard from '../common/ChartCard';

type Json = Record<string, unknown>;
type TabKey = 'finance' | 'admissions' | 'attendance';

const FINANCE_ROLES = ['super_admin', 'school_admin', 'accountant'];
const ADMISSION_ROLES = ['super_admin', 'school_admin', 'admission_officer'];
const ATTENDANCE_ROLES = ['super_admin', 'school_admin', 'teacher'];

const MAX_FINANCE_DAYS = 366;
const MAX_ATTENDANCE_DAYS = 92;

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bnNum = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

// Copied (not imported) per project convention
const FALLBACK_CLASSES: { id: string; nameBn: string; nameEn: string }[] = [
  { id: 'play', nameBn: 'প্লে', nameEn: 'Play' },
  { id: 'nursery', nameBn: 'নার্সারি', nameEn: 'Nursery' },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    nameBn: `শ্রেণি ${bnNum(i + 1)}`,
    nameEn: `Class ${i + 1}`,
  })),
];

/** Today's date in Bangladesh time (UTC+6) as YYYY-MM-DD */
const todayBdString = (): string =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  if (isObj(v)) return num(v.total ?? v.amount ?? v.sum ?? v.count ?? v.value ?? 0);
  return 0;
}

function humanize(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, (c) => c.toUpperCase());
}

/** Turns an array of objects or an object map into { key, value } rows */
function toRows(v: unknown): { key: string; value: number }[] {
  if (Array.isArray(v)) {
    return v
      .filter(isObj)
      .map((o) => ({
        key: String(o.key ?? o.name ?? o.label ?? o.category ?? o.provider ?? o.status ?? o.month ?? o.date ?? ''),
        value: num(o.total ?? o.amount ?? o.count ?? o.value ?? o.collected),
      }));
  }
  if (isObj(v)) return Object.entries(v).map(([key, value]) => ({ key, value: num(value) }));
  return [];
}

function validRange(from: string, to: string, maxDays: number, tr: (bn: string, en: string) => string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return tr('সঠিক তারিখ দিন', 'Enter valid dates');
  }
  if (from > to) return tr('শুরুর তারিখ শেষের তারিখের পরে হতে পারে না', '"From" must not be after "To"');
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (days > maxDays) return tr(`সর্বোচ্চ ${maxDays} দিনের ব্যবধান`, `Range must not exceed ${maxDays} days`);
  return '';
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function RowsTable({ rows, valueLabel, keyLabel, money }: { rows: { key: string; value: number }[]; keyLabel: string; valueLabel: string; money?: boolean }) {
  const { isBengali } = useLanguage();
  const fmt = (n: number) =>
    (money ? '৳ ' : '') + n.toLocaleString(isBengali ? 'bn-BD' : 'en-US', { maximumFractionDigits: 2 });
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-navy/10 text-navy">
          <th className="py-1 pr-3">{keyLabel}</th>
          <th className="py-1 text-right">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-navy/5">
            <td className="py-1 pr-3">{r.key ? humanize(r.key) : '—'}</td>
            <td className="py-1 text-right whitespace-nowrap">{fmt(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RangeForm({
  from,
  to,
  maxDays,
  onApply,
  extra,
  right,
}: {
  from: string;
  to: string;
  maxDays: number;
  onApply: (from: string, to: string) => void;
  extra?: ReactNode;
  right?: ReactNode;
}) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [err, setErr] = useState('');
  return (
    <form
      className="card flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const m = validRange(f, t, maxDays, tr);
        setErr(m);
        if (!m) onApply(f, t);
      }}
    >
      <div>
        <label className="label">{tr('শুরু', 'From')}</label>
        <input type="date" className="input-field" value={f} onChange={(e) => setF(e.target.value)} />
      </div>
      <div>
        <label className="label">{tr('শেষ', 'To')}</label>
        <input type="date" className="input-field" value={t} onChange={(e) => setT(e.target.value)} />
      </div>
      {extra}
      <button type="submit" className="btn-primary">{tr('দেখুন', 'Show')}</button>
      {right}
      {err && <p className="error-text w-full">{err}</p>}
    </form>
  );
}

function StateBanners({ isWaking, error, isLoading, retry, truncated }: { isWaking: boolean; error: unknown; isLoading: boolean; retry: () => void; truncated?: boolean }) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  return (
    <>
      {isWaking && <div className="card text-sm text-ink">{tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}</div>}
      {Boolean(error) && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('রিপোর্ট লোড করা যায়নি।', 'Could not load the report.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={retry}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}
      {truncated && (
        <div className="card border-l-4 border-gold text-sm text-ink">
          {tr('ডেটা অনেক বেশি হওয়ায় ফলাফল আংশিক। তারিখের পরিসর ছোট করুন।', 'Too much data — results are partial. Narrow the date range.')}
        </div>
      )}
    </>
  );
}

function FinanceTab() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const today = todayBdString();
  const [range, setRange] = useState({ from: `${today.slice(0, 8)}01`, to: today });
  const path = `/api/reports/finance?from=${range.from}&to=${range.to}`;
  const { data, isLoading, isWaking, error, execute } = useApiGet<{ item: Json }>(path, [path]);
  const item = data?.item;

  const collected = num(item?.collected);
  const expenses = num(item?.expenses);
  const outstanding = num(item?.outstanding);
  const net = collected - expenses;
  const money = (n: number) => `৳ ${n.toLocaleString(isBengali ? 'bn-BD' : 'en-US', { maximumFractionDigits: 2 })}`;

  const providers = toRows(item?.byProvider);
  const categories = toRows(item?.byCategory);

  const monthly: { key: string; collected: number; expenses: number }[] = (() => {
    const m = item?.monthly;
    if (Array.isArray(m)) {
      return m.filter(isObj).map((o) => ({
        key: String(o.month ?? o.key ?? o.date ?? ''),
        collected: num(o.collected),
        expenses: num(o.expenses),
      }));
    }
    if (isObj(m)) {
      return Object.entries(m).map(([key, v]) => ({
        key,
        collected: isObj(v) ? num(v.collected) : num(v),
        expenses: isObj(v) ? num(v.expenses) : 0,
      }));
    }
    return [];
  })();
  const maxMonthly = Math.max(1, ...monthly.flatMap((m) => [m.collected, m.expenses]));

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['summary', 'collected', collected],
      ['summary', 'expenses', expenses],
      ['summary', 'net', net],
      ['summary', 'outstanding', outstanding],
      ...providers.map((r) => ['provider', r.key, r.value] as (string | number)[]),
      ...categories.map((r) => ['category', r.key, r.value] as (string | number)[]),
      ...monthly.flatMap((m) => [['month-collected', m.key, m.collected], ['month-expenses', m.key, m.expenses]] as (string | number)[][]),
    ];
    downloadCsv(`finance_${range.from}_${range.to}.csv`, ['section', 'key', 'value'], rows);
  };

  return (
    <div className="space-y-4">
      <RangeForm
        from={range.from}
        to={range.to}
        maxDays={MAX_FINANCE_DAYS}
        onApply={(from, to) => setRange({ from, to })}
        right={
          <button type="button" disabled={!item} className="rounded border border-navy/30 px-3 py-2 text-sm disabled:opacity-40" onClick={exportCsv}>
            CSV
          </button>
        }
      />
      <StateBanners isWaking={isWaking} error={error} isLoading={isLoading} retry={() => execute()} truncated={Boolean(item?.truncated)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tr('আদায় (যাচাইকৃত)', 'Collected (verified)')} value={item ? money(collected) : null} tone="royal" isLoading={isLoading} />
        <StatCard label={tr('খরচ', 'Expenses')} value={item ? money(expenses) : null} tone="gold" isLoading={isLoading} />
        <StatCard label={tr('নিট', 'Net')} value={item ? money(net) : null} tone={net < 0 ? 'alert' : 'navy'} isLoading={isLoading} />
        <StatCard
          label={tr('বকেয়া (বর্তমান)', 'Outstanding (current)')}
          value={item ? money(outstanding) : null}
          hint={tr('তারিখ পরিসরের বাইরেও গণনা', 'Not limited to the date range')}
          tone="alert"
          isLoading={isLoading}
        />
      </div>

      <ChartCard title={tr('মাসভিত্তিক', 'By month')} isLoading={isLoading} isEmpty={monthly.length === 0} emptyText={tr('কোনো তথ্য নেই', 'No data')}>
        <ul className="space-y-3">
          {monthly.map((m) => (
            <li key={m.key}>
              <div className="mb-1 flex justify-between text-xs text-ink/70">
                <span>{m.key}</span>
                <span>{money(m.collected)} / {money(m.expenses)}</span>
              </div>
              <div className="h-2 rounded bg-surface"><div className="h-2 rounded bg-royal" style={{ width: `${(m.collected / maxMonthly) * 100}%` }} /></div>
              <div className="mt-1 h-2 rounded bg-surface"><div className="h-2 rounded bg-gold" style={{ width: `${(m.expenses / maxMonthly) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink/60">
          <span className="text-royal">■</span> {tr('আদায়', 'Collected')} &nbsp; <span className="text-gold">■</span> {tr('খরচ', 'Expenses')}
        </p>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={tr('মাধ্যম অনুযায়ী আদায়', 'Collected by provider')} isLoading={isLoading} isEmpty={providers.length === 0} emptyText={tr('কোনো তথ্য নেই', 'No data')}>
          <RowsTable rows={providers} keyLabel={tr('মাধ্যম', 'Provider')} valueLabel={tr('পরিমাণ', 'Amount')} money />
        </ChartCard>
        <ChartCard title={tr('ক্যাটাগরি অনুযায়ী খরচ', 'Expenses by category')} isLoading={isLoading} isEmpty={categories.length === 0} emptyText={tr('কোনো তথ্য নেই', 'No data')}>
          <RowsTable rows={categories} keyLabel={tr('ক্যাটাগরি', 'Category')} valueLabel={tr('পরিমাণ', 'Amount')} money />
        </ChartCard>
      </div>
    </div>
  );
}

const ADMISSION_SKIP = new Set(['truncated', 'sessionId', 'from', 'to']);

function AdmissionsTab() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState('');
  const path = `/api/reports/admissions${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`;
  const { data, isLoading, isWaking, error, execute } = useApiGet<{ item: Json }>(path, [path]);
  const item = data?.item;

  const sections = item
    ? Object.entries(item)
        .filter(([k, v]) => !ADMISSION_SKIP.has(k) && (Array.isArray(v) || isObj(v)))
        .map(([k, v]) => ({ key: k, rows: toRows(v) }))
        .filter((s) => s.rows.length > 0)
    : [];
  const totalValue = item ? num(item.total ?? item.count) : 0;

  const exportCsv = () => {
    const rows = sections.flatMap((s) => s.rows.map((r) => [s.key, r.key, r.value] as (string | number)[]));
    downloadCsv(`admissions${sessionId ? `_${sessionId}` : ''}.csv`, ['section', 'key', 'count'], rows);
  };

  return (
    <div className="space-y-4">
      <form
        className="card flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSessionId(draft.trim());
        }}
      >
        <div>
          <label className="label" htmlFor="rp-session">{tr('সেশন (ঐচ্ছিক)', 'Session (optional)')}</label>
          <input id="rp-session" className="input-field" placeholder={tr('খালি = সক্রিয় সেশন', 'Blank = active session')} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">{tr('দেখুন', 'Show')}</button>
        <button type="button" disabled={sections.length === 0} className="rounded border border-navy/30 px-3 py-2 text-sm disabled:opacity-40" onClick={exportCsv}>
          CSV
        </button>
      </form>
      <StateBanners isWaking={isWaking} error={error} isLoading={isLoading} retry={() => execute()} truncated={Boolean(item?.truncated)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tr('মোট আবেদন', 'Total applications')} value={item && totalValue ? totalValue.toLocaleString(isBengali ? 'bn-BD' : 'en-US') : null} tone="royal" isLoading={isLoading} />
      </div>

      {sections.length === 0 && !isLoading && !error && (
        <div className="card text-sm text-ink">{tr('কোনো তথ্য নেই।', 'No data.')}</div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((s) => (
          <ChartCard key={s.key} title={humanize(s.key)}>
            <RowsTable rows={s.rows} keyLabel={tr('বিভাগ', 'Group')} valueLabel={tr('সংখ্যা', 'Count')} />
          </ChartCard>
        ))}
      </div>
    </div>
  );
}

interface DayRow {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  pct: number;
}

function AttendanceTab() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const today = todayBdString();
  const [range, setRange] = useState({ from: `${today.slice(0, 8)}01`, to: today });
  const [classDraft, setClassDraft] = useState('');
  const [classId, setClassId] = useState('');

  const qs = new URLSearchParams({ from: range.from, to: range.to });
  if (classId) qs.set('classId', classId);
  const path = `/api/reports/attendance?${qs.toString()}`;
  const { data, isLoading, isWaking, error, execute } = useApiGet<{ item: Json }>(path, [path]);
  const item = data?.item;

  const rawDays = (item && (item.days ?? item.daily ?? item.byDay ?? item.items)) as unknown;
  const days: DayRow[] = Array.isArray(rawDays)
    ? rawDays.filter(isObj).map((o) => {
        const present = num(o.present);
        const late = num(o.late);
        const total = num(o.total) || present + late + num(o.absent) + num(o.leave);
        return {
          date: String(o.date ?? o.day ?? ''),
          total,
          present,
          absent: num(o.absent),
          late,
          leave: num(o.leave),
          pct: o.percentage !== undefined ? num(o.percentage) : o.pct !== undefined ? num(o.pct) : total ? Math.round(((present + late) / total) * 10000) / 100 : 0,
        };
      })
    : [];

  const sum = (k: 'total' | 'present' | 'absent' | 'late' | 'leave') => days.reduce((s, d) => s + d[k], 0);
  const overall = sum('total') ? Math.round(((sum('present') + sum('late')) / sum('total')) * 10000) / 100 : 0;
  const nf = (n: number) => n.toLocaleString(isBengali ? 'bn-BD' : 'en-US', { maximumFractionDigits: 2 });

  const exportCsv = () =>
    downloadCsv(
      `attendance_${range.from}_${range.to}${classId ? `_${classId}` : ''}.csv`,
      ['date', 'total', 'present', 'absent', 'late', 'leave', 'percentage'],
      days.map((d) => [d.date, d.total, d.present, d.absent, d.late, d.leave, d.pct]),
    );

  return (
    <div className="space-y-4">
      <RangeForm
        from={range.from}
        to={range.to}
        maxDays={MAX_ATTENDANCE_DAYS}
        onApply={(from, to) => {
          setRange({ from, to });
          setClassId(classDraft);
        }}
        extra={
          <div>
            <label className="label" htmlFor="rp-class">{tr('শ্রেণি', 'Class')}</label>
            <select id="rp-class" className="input-field" value={classDraft} onChange={(e) => setClassDraft(e.target.value)}>
              <option value="">{tr('সব শ্রেণি', 'All classes')}</option>
              {FALLBACK_CLASSES.map((c) => (
                <option key={c.id} value={c.id}>{isBengali ? c.nameBn : c.nameEn}</option>
              ))}
            </select>
          </div>
        }
        right={
          <button type="button" disabled={days.length === 0} className="rounded border border-navy/30 px-3 py-2 text-sm disabled:opacity-40" onClick={exportCsv}>
            CSV
          </button>
        }
      />
      <StateBanners isWaking={isWaking} error={error} isLoading={isLoading} retry={() => execute()} truncated={Boolean(item?.truncated)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tr('উপস্থিতির হার', 'Attendance rate')} value={days.length ? `${nf(overall)}%` : null} tone="royal" isLoading={isLoading} />
        <StatCard label={tr('উপস্থিত', 'Present')} value={days.length ? nf(sum('present')) : null} tone="navy" isLoading={isLoading} />
        <StatCard label={tr('অনুপস্থিত', 'Absent')} value={days.length ? nf(sum('absent')) : null} tone="alert" isLoading={isLoading} />
        <StatCard label={tr('বিলম্ব / ছুটি', 'Late / Leave')} value={days.length ? `${nf(sum('late'))} / ${nf(sum('leave'))}` : null} tone="gold" isLoading={isLoading} />
      </div>

      <ChartCard title={tr('দিনভিত্তিক', 'Per day')} isLoading={isLoading} isEmpty={days.length === 0} emptyText={tr('কোনো তথ্য নেই', 'No data')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-navy">
                <th className="py-1 pr-3">{tr('তারিখ', 'Date')}</th>
                <th className="py-1 pr-3 text-right">{tr('মোট', 'Total')}</th>
                <th className="py-1 pr-3 text-right">{tr('উপস্থিত', 'Present')}</th>
                <th className="py-1 pr-3 text-right">{tr('অনুপস্থিত', 'Absent')}</th>
                <th className="py-1 pr-3 text-right">{tr('বিলম্ব', 'Late')}</th>
                <th className="py-1 pr-3 text-right">{tr('ছুটি', 'Leave')}</th>
                <th className="py-1 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-b border-navy/5">
                  <td className="py-1 pr-3 whitespace-nowrap">{d.date}</td>
                  <td className="py-1 pr-3 text-right">{nf(d.total)}</td>
                  <td className="py-1 pr-3 text-right">{nf(d.present)}</td>
                  <td className="py-1 pr-3 text-right">{nf(d.absent)}</td>
                  <td className="py-1 pr-3 text-right">{nf(d.late)}</td>
                  <td className="py-1 pr-3 text-right">{nf(d.leave)}</td>
                  <td className="py-1 text-right">{nf(d.pct)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

export default function ReportsPage() {
  const { isBengali } = useLanguage();
  const { role, isLoading } = useAuth();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const r = role as string | null | undefined;
  const tabs: { key: TabKey; label: string }[] = [
    ...(r && FINANCE_ROLES.includes(r) ? [{ key: 'finance' as const, label: tr('আর্থিক', 'Finance') }] : []),
    ...(r && ADMISSION_ROLES.includes(r) ? [{ key: 'admissions' as const, label: tr('ভর্তি', 'Admissions') }] : []),
    ...(r && ATTENDANCE_ROLES.includes(r) ? [{ key: 'attendance' as const, label: tr('উপস্থিতি', 'Attendance') }] : []),
  ];

  const [picked, setPicked] = useState<TabKey | null>(null);
  const active: TabKey | null = picked && tabs.some((t) => t.key === picked) ? picked : tabs[0]?.key ?? null;

  return (
    <div className="space-y-4">
      <h1 className="section-title">{tr('রিপোর্ট', 'Reports')}</h1>

      {isLoading && <div className="card text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</div>}
      {!isLoading && tabs.length === 0 && (
        <div className="card text-sm text-ink">{tr('এই ভূমিকার জন্য কোনো রিপোর্ট নেই।', 'No reports are available for your role.')}</div>
      )}

      {tabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`rounded-full border px-4 py-1 text-sm ${active === t.key ? 'border-royal bg-royal text-white' : 'border-navy/30 text-navy'}`}
              onClick={() => setPicked(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {active === 'finance' && <FinanceTab />}
      {active === 'admissions' && <AdmissionsTab />}
      {active === 'attendance' && <AttendanceTab />}
    </div>
  );
  }
