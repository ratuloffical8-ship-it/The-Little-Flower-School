// src/features/admin/attendance/TeacherAttendancePage.tsx
// Admin / school-admin view of teacher attendance:
//   • Daily: mark attendance for teachers (e.g. those without a smartphone)
//   • Monthly: teacher × day grid, per-teacher class totals, CSV download, class logs
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi, useApiGet } from '../../../hooks/useApi';

/* ── Types ── */

type AttStatus = 'present' | 'absent' | 'late' | 'leave';
type LogStatus = 'completed' | 'partial' | 'not_taken';

interface Teacher {
  id: string;
  name: string;
  designation?: string;
  subject?: string;
  isActive?: boolean;
}

interface Att {
  teacherId: string;
  date: string;
  status: AttStatus;
  checkInTime?: string;
  selfMarked?: boolean;
  note?: string;
}

interface ClassLog {
  id: string;
  teacherId: string;
  date: string;
  classId: string;
  subject: string;
  period?: number;
  topic?: string;
  status: LogStatus;
}

interface Summary {
  present: number;
  absent: number;
  late: number;
  leave: number;
  classesTotal: number;
  classesCompleted: number;
  classesPartial: number;
  classesNotTaken: number;
  completionPercent: number;
}

interface MonthResponse {
  items: Att[];
  classes: ClassLog[];
  summary: Record<string, Summary>;
}

interface ClassOption {
  id: string;
  nameBn: string;
  nameEn: string;
  order?: number;
}

/* ── Constants ── */

const STATUSES: AttStatus[] = ['present', 'late', 'absent', 'leave'];

const ATT_META: Record<
  AttStatus,
  { bn: string; en: string; short: { bn: string; en: string }; pill: string; solid: string }
> = {
  present: { bn: 'উপস্থিত', en: 'Present', short: { bn: 'উ', en: 'P' }, pill: 'bg-green-100 text-green-800', solid: 'bg-green-600 text-white' },
  late: { bn: 'দেরিতে', en: 'Late', short: { bn: 'দ', en: 'L' }, pill: 'bg-amber-100 text-amber-800', solid: 'bg-amber-500 text-white' },
  absent: { bn: 'অনুপস্থিত', en: 'Absent', short: { bn: 'অ', en: 'A' }, pill: 'bg-red-100 text-red-800', solid: 'bg-red-600 text-white' },
  leave: { bn: 'ছুটি', en: 'Leave', short: { bn: 'ছু', en: 'Lv' }, pill: 'bg-blue-100 text-blue-800', solid: 'bg-blue-600 text-white' },
};

const LOG_META: Record<LogStatus, { bn: string; en: string; pill: string }> = {
  completed: { bn: 'সম্পূর্ণ', en: 'Completed', pill: 'bg-green-100 text-green-800' },
  partial: { bn: 'আংশিক', en: 'Partial', pill: 'bg-amber-100 text-amber-800' },
  not_taken: { bn: 'নেওয়া হয়নি', en: 'Not taken', pill: 'bg-red-100 text-red-800' },
};

const FALLBACK_CLASSES: ClassOption[] = [
  { id: 'play', nameBn: 'প্লে', nameEn: 'Play' },
  { id: 'nursery', nameBn: 'নার্সারি', nameEn: 'Nursery' },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    nameBn: `শ্রেণি ${i + 1}`,
    nameEn: `Class ${i + 1}`,
  })),
];

const pad = (n: number): string => String(n).padStart(2, '0');

function todayBdString(): string {
  const now = new Date();
  const bd = new Date(now.getTime() + (6 * 60 - now.getTimezoneOffset()) * 60000);
  return bd.toISOString().slice(0, 10);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

const emptySummary = (): Summary => ({
  present: 0,
  absent: 0,
  late: 0,
  leave: 0,
  classesTotal: 0,
  classesCompleted: 0,
  classesPartial: 0,
  classesNotTaken: 0,
  completionPercent: 0,
});

/* ── Component ── */

export default function TeacherAttendancePage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const num = (n: number | string) =>
    isBengali ? Number(n).toLocaleString('bn-BD', { useGrouping: false }) : String(n);

  const today = todayBdString();
  const thisMonth = today.slice(0, 7);

  const [tab, setTab] = useState<'day' | 'month'>('day');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(thisMonth);
  const [logTeacher, setLogTeacher] = useState('');

  const teachersRes = useApiGet<{ items: Teacher[] }>('/api/teachers', []);
  const dayRes = useApiGet<{ items: Att[] }>(
    tab === 'day' ? `/api/attendance/teachers/day?date=${date}` : '',
    [tab, date],
  );
  const monthRes = useApiGet<MonthResponse>(
    tab === 'month' ? `/api/attendance/teachers/month?month=${month}` : '',
    [tab, month],
  );
  const classesRes = useApiGet<{ items?: ClassOption[] } | ClassOption[]>('/api/classes', []);

  const markApi = useApi<{ success: boolean; saved?: number }>('POST');
  const delApi = useApi<{ success: boolean }>('DELETE');

  const teachers = useMemo(
    () => (teachersRes.data?.items ?? []).filter((t) => t.isActive !== false),
    [teachersRes.data],
  );
  const teacherName = (id: string): string => teachers.find((t) => t.id === id)?.name ?? id;

  const classes: ClassOption[] = useMemo(() => {
    const d = classesRes.data;
    const arr = Array.isArray(d) ? d : d?.items;
    return arr && arr.length > 0 ? arr : FALLBACK_CLASSES;
  }, [classesRes.data]);
  const className = (id: string): string => {
    const c = classes.find((x) => x.id === id);
    return c ? (isBengali ? c.nameBn : c.nameEn) : id;
  };

  /* ── Daily marking ── */

  const existingByTeacher = useMemo(() => {
    const m: Record<string, Att> = {};
    for (const a of dayRes.data?.items ?? []) m[a.teacherId] = a;
    return m;
  }, [dayRes.data]);

  const [draft, setDraft] = useState<Record<string, { status: AttStatus | ''; note: string }>>({});
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const next: Record<string, { status: AttStatus | ''; note: string }> = {};
    teachers.forEach((t) => {
      const e = existingByTeacher[t.id];
      next[t.id] = { status: e?.status ?? '', note: e?.note ?? '' };
    });
    setDraft(next);
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, existingByTeacher, date]);

  function markAllUnset(status: AttStatus) {
    const next = { ...draft };
    teachers.forEach((t) => {
      if (!next[t.id]?.status) next[t.id] = { status, note: next[t.id]?.note ?? '' };
    });
    setDraft(next);
  }

  async function saveDay() {
    setMsg(null);
    const records = teachers
      .filter((t) => {
        const d = draft[t.id];
        if (!d || !d.status) return false;
        const e = existingByTeacher[t.id];
        return !e || e.status !== d.status || (e.note ?? '') !== d.note.trim();
      })
      .map((t) => ({
        teacherId: t.id,
        status: draft[t.id].status as AttStatus,
        note: draft[t.id].note.trim() || undefined,
      }));

    if (records.length === 0) {
      setMsg({ type: 'err', text: tr('বদলানো কিছু নেই।', 'Nothing changed to save.') });
      return;
    }
    try {
      await markApi.execute('/api/attendance/teachers/mark', { date, records });
      setMsg({ type: 'ok', text: tr(`${num(records.length)} জনের হাজিরা সংরক্ষিত হয়েছে।`, `Saved attendance for ${records.length} teacher(s).`) });
      await dayRes.execute();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : tr('সংরক্ষণ ব্যর্থ।', 'Save failed.') });
    }
  }

  /* ── Monthly ── */

  const [yearNum, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(yearNum, monthNum - 1, 1)).getUTCDay();
  const monthLabel = new Date(Date.UTC(yearNum, monthNum - 1, 1)).toLocaleDateString(
    isBengali ? 'bn-BD' : 'en-GB',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  );

  const attByKey = useMemo(() => {
    const m: Record<string, Att> = {};
    for (const a of monthRes.data?.items ?? []) m[`${a.teacherId}|${a.date}`] = a;
    return m;
  }, [monthRes.data]);

  const visibleLogs = useMemo(
    () =>
      (monthRes.data?.classes ?? [])
        .filter((l) => !logTeacher || l.teacherId === logTeacher)
        .sort((a, b) => b.date.localeCompare(a.date) || (a.period ?? 99) - (b.period ?? 99)),
    [monthRes.data, logTeacher],
  );

  async function removeLog(id: string) {
    if (!window.confirm(tr('এই ক্লাস লগ মুছবেন?', 'Delete this class log?'))) return;
    try {
      await delApi.execute(`/api/attendance/teachers/classes/${id}`);
      await monthRes.execute();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : tr('ব্যর্থ হয়েছে।', 'Failed.') });
    }
  }

  function downloadCsv() {
    const head = [
      'Teacher', 'Designation', 'Present', 'Late', 'Absent', 'Leave',
      'Classes total', 'Completed', 'Partial', 'Not taken', 'Completion %',
    ];
    const rows = teachers.map((t) => {
      const s = monthRes.data?.summary?.[t.id] ?? emptySummary();
      return [
        t.name, t.designation ?? '', s.present, s.late, s.absent, s.leave,
        s.classesTotal, s.classesCompleted, s.classesPartial, s.classesNotTaken, s.completionPercent,
      ];
    });
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isWaking = teachersRes.isWaking || dayRes.isWaking || monthRes.isWaking;

  /* ── Render ── */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">{tr('শিক্ষক হাজিরা', 'Teacher Attendance')}</h1>
        <p className="text-sm text-ink/70">
          {tr(
            'শিক্ষকরা নিজেরা হাজিরা দেন। যাদের স্মার্টফোন নেই তাদের হাজিরা এখান থেকে দিন।',
            'Teachers check in themselves. Use this page for those without a smartphone.',
          )}
        </p>
      </div>

      {isWaking && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50">
          <p className="text-sm text-amber-900">
            {tr('সার্ভার চালু হচ্ছে, দয়া করে অপেক্ষা করুন…', 'Server is waking up, please wait…')}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {(['day', 'month'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={
              'rounded-lg px-4 py-2 text-sm font-semibold transition ' +
              (tab === k ? 'bg-navy text-white' : 'bg-surface text-ink hover:bg-navy/10')
            }
          >
            {k === 'day' ? tr('দৈনিক হাজিরা', 'Daily') : tr('মাসিক রিপোর্ট', 'Monthly report')}
          </button>
        ))}
      </div>

      {msg && (
        <div
          className={
            'rounded border-l-4 p-3 text-sm ' +
            (msg.type === 'ok'
              ? 'border-l-green-600 bg-green-50 text-green-800'
              : 'border-l-red-600 bg-red-50 text-red-700')
          }
        >
          {msg.text}
        </div>
      )}

      {/* ───────── Daily ───────── */}
      {tab === 'day' && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <label className="label" htmlFor="ta-date">
                {tr('তারিখ', 'Date')}
              </label>
              <input
                id="ta-date"
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => markAllUnset('present')}
                className="rounded border border-navy/30 px-3 py-2 text-xs text-navy hover:bg-navy/5"
              >
                {tr('বাকিদের উপস্থিত', 'Mark remaining present')}
              </button>
              <button
                type="button"
                onClick={saveDay}
                disabled={markApi.isLoading || teachers.length === 0}
                className="btn-primary disabled:opacity-50"
              >
                {markApi.isLoading ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ করুন', 'Save')}
              </button>
            </div>
          </div>

          {teachers.length === 0 ? (
            <p className="py-8 text-center text-ink/60">
              {tr('কোনো সক্রিয় শিক্ষক নেই। আগে "শিক্ষক" পেইজে শিক্ষক যোগ করুন।', 'No active teachers. Add teachers first.')}
            </p>
          ) : (
            <ul className="divide-y divide-surface">
              {teachers.map((t) => {
                const d = draft[t.id] ?? { status: '' as const, note: '' };
                const e = existingByTeacher[t.id];
                return (
                  <li key={t.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                      <p className="text-xs text-ink/50">
                        {[t.designation, t.subject].filter(Boolean).join(' · ')}
                        {e?.selfMarked && e.checkInTime && (
                          <span className="ml-2 text-green-700">
                            {tr('নিজে চেক-ইন', 'Self check-in')} {e.checkInTime}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setDraft({ ...draft, [t.id]: { ...d, status: st } })}
                          className={
                            'rounded-lg px-3 py-1.5 text-xs font-medium transition ' +
                            (d.status === st ? ATT_META[st].solid : 'bg-surface text-ink hover:bg-navy/10')
                          }
                        >
                          {tr(ATT_META[st].bn, ATT_META[st].en)}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={d.note}
                      onChange={(ev) => setDraft({ ...draft, [t.id]: { ...d, note: ev.target.value } })}
                      placeholder={tr('ঐচ্ছিক নোট', 'Optional note')}
                      className="input-field md:w-44"
                      maxLength={200}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ───────── Monthly ───────── */}
      {tab === 'month' && (
        <>
          <div className="card flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(month, -1))}
                className="rounded border border-navy/30 px-3 py-2 text-navy hover:bg-navy/5"
              >
                ‹
              </button>
              <div className="flex-1 rounded bg-navy/5 px-3 py-2 text-center text-sm font-semibold text-navy">
                {monthLabel}
              </div>
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(month, 1))}
                disabled={month >= thisMonth}
                className="rounded border border-navy/30 px-3 py-2 text-navy hover:bg-navy/5 disabled:opacity-40"
              >
                ›
              </button>
            </div>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!monthRes.data}
              className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-40"
            >
              {tr('CSV ডাউনলোড', 'Download CSV')}
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs">
                <thead>
                  <tr className="bg-surface">
                    <th className="sticky left-0 z-10 min-w-[150px] bg-surface px-3 py-2 text-left">
                      {tr('শিক্ষক', 'Teacher')}
                    </th>
                    {Array.from({ length: daysInMonth }).map((_, i) => (
                      <th
                        key={i}
                        className={
                          'px-1 py-2 text-center font-medium ' +
                          ((firstWeekday + i) % 7 === 5 ? 'text-red-500' : 'text-ink/60')
                        }
                      >
                        {num(i + 1)}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center text-green-700">{tr('উ', 'P')}</th>
                    <th className="px-2 py-2 text-center text-amber-600">{tr('দ', 'L')}</th>
                    <th className="px-2 py-2 text-center text-red-600">{tr('অ', 'A')}</th>
                    <th className="px-2 py-2 text-center text-blue-600">{tr('ছু', 'Lv')}</th>
                    <th className="px-2 py-2 text-center">{tr('ক্লাস', 'Classes')}</th>
                    <th className="px-2 py-2 text-center">{tr('সম্পূর্ণ %', 'Done %')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => {
                    const s = monthRes.data?.summary?.[t.id] ?? emptySummary();
                    return (
                      <tr key={t.id} className="border-t border-surface">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-ink">{t.name}</td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const a = attByKey[`${t.id}|${month}-${pad(i + 1)}`];
                          return (
                            <td key={i} className="p-0.5 text-center">
                              {a ? (
                                <span
                                  title={a.checkInTime ? `${a.checkInTime}${a.note ? ` — ${a.note}` : ''}` : a.note || undefined}
                                  className={
                                    'inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ' +
                                    ATT_META[a.status].solid
                                  }
                                >
                                  {isBengali ? ATT_META[a.status].short.bn : ATT_META[a.status].short.en}
                                </span>
                              ) : (
                                <span className="inline-block h-5 w-5 rounded bg-surface" />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 text-center font-semibold">{num(s.present)}</td>
                        <td className="px-2 text-center font-semibold">{num(s.late)}</td>
                        <td className="px-2 text-center font-semibold">{num(s.absent)}</td>
                        <td className="px-2 text-center font-semibold">{num(s.leave)}</td>
                        <td className="px-2 text-center">{num(s.classesTotal)}</td>
                        <td className="px-2 text-center font-semibold text-navy">
                          {s.classesTotal ? `${num(s.completionPercent)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan={daysInMonth + 7} className="px-4 py-8 text-center text-ink/60">
                        {tr('কোনো শিক্ষক নেই।', 'No teachers.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Class logs */}
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-navy">{tr('ক্লাস লগ', 'Class logs')}</h2>
              <select
                value={logTeacher}
                onChange={(e) => setLogTeacher(e.target.value)}
                className="input-field sm:w-56"
              >
                <option value="">{tr('সব শিক্ষক', 'All teachers')}</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {visibleLogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink/60">
                {tr('এই মাসে কোনো ক্লাস লগ নেই।', 'No class logs this month.')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-surface text-left text-xs text-ink/70">
                    <tr>
                      <th className="px-3 py-2">{tr('তারিখ', 'Date')}</th>
                      <th className="px-3 py-2">{tr('শিক্ষক', 'Teacher')}</th>
                      <th className="px-3 py-2">{tr('শ্রেণি', 'Class')}</th>
                      <th className="px-3 py-2">{tr('বিষয়', 'Subject')}</th>
                      <th className="px-3 py-2">{tr('পিরিয়ড', 'Period')}</th>
                      <th className="px-3 py-2">{tr('অবস্থা', 'Status')}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLogs.map((l) => (
                      <tr key={l.id} className="border-t border-surface">
                        <td className="px-3 py-2 text-xs text-ink/60">{l.date}</td>
                        <td className="px-3 py-2">{teacherName(l.teacherId)}</td>
                        <td className="px-3 py-2">{className(l.classId)}</td>
                        <td className="px-3 py-2">
                          {l.subject}
                          {l.topic && <p className="text-xs text-ink/50">{l.topic}</p>}
                        </td>
                        <td className="px-3 py-2">{l.period ? num(l.period) : '—'}</td>
                        <td className="px-3 py-2">
                          <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + LOG_META[l.status].pill}>
                            {tr(LOG_META[l.status].bn, LOG_META[l.status].en)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => removeLog(l.id)} className="text-xs text-red-600 hover:underline">
                            {tr('মুছুন', 'Delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
    }
