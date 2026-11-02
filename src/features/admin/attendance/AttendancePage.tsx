// src/features/admin/attendance/AttendancePage.tsx
// Student attendance — calendar view. Pick a class, see the whole month as a calendar of
// colour rings, click a day to mark / edit it, and see a student × day heat-map below.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi, useApiGet } from '../../../hooks/useApi';

/* ── Types ── */

interface ClassOption {
  id: string;
  nameBn: string;
  nameEn: string;
  order?: number;
}

interface ClassesResponse {
  items?: ClassOption[];
}

interface StudentListItem {
  id: string;
  studentId: string;
  name: string;
  classId: string;
  roll?: number | string;
  isActive?: boolean;
}

interface StudentsListResponse {
  items: StudentListItem[];
}

type Status = 'present' | 'absent' | 'late' | 'leave';

interface AttendanceRecord {
  studentId: string;
  date: string;
  status: Status;
  note?: string;
}

interface MonthResponse {
  items: AttendanceRecord[];
}

interface DayCounts {
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
}

/* ── Constants ── */

const FALLBACK_CLASSES: ClassOption[] = [
  { id: 'play', nameBn: 'প্লে', nameEn: 'Play', order: 0 },
  { id: 'nursery', nameBn: 'নার্সারি', nameEn: 'Nursery', order: 1 },
  { id: '1', nameBn: 'প্রথম', nameEn: 'Class 1', order: 2 },
  { id: '2', nameBn: 'দ্বিতীয়', nameEn: 'Class 2', order: 3 },
  { id: '3', nameBn: 'তৃতীয়', nameEn: 'Class 3', order: 4 },
  { id: '4', nameBn: 'চতুর্থ', nameEn: 'Class 4', order: 5 },
  { id: '5', nameBn: 'পঞ্চম', nameEn: 'Class 5', order: 6 },
  { id: '6', nameBn: 'ষষ্ঠ', nameEn: 'Class 6', order: 7 },
  { id: '7', nameBn: 'সপ্তম', nameEn: 'Class 7', order: 8 },
  { id: '8', nameBn: 'অষ্টম', nameEn: 'Class 8', order: 9 },
  { id: '9', nameBn: 'নবম', nameEn: 'Class 9', order: 10 },
  { id: '10', nameBn: 'দশম', nameEn: 'Class 10', order: 11 },
];

const STATUSES: Status[] = ['present', 'absent', 'late', 'leave'];

const STATUS_META: Record<
  Status,
  { bn: string; en: string; short: { bn: string; en: string }; color: string; pill: string; solid: string }
> = {
  present: {
    bn: 'উপস্থিত',
    en: 'Present',
    short: { bn: 'উ', en: 'P' },
    color: '#16a34a',
    pill: 'bg-green-100 text-green-800',
    solid: 'bg-green-600 text-white',
  },
  absent: {
    bn: 'অনুপস্থিত',
    en: 'Absent',
    short: { bn: 'অ', en: 'A' },
    color: '#dc2626',
    pill: 'bg-red-100 text-red-800',
    solid: 'bg-red-600 text-white',
  },
  late: {
    bn: 'দেরিতে',
    en: 'Late',
    short: { bn: 'দ', en: 'L' },
    color: '#f59e0b',
    pill: 'bg-amber-100 text-amber-800',
    solid: 'bg-amber-500 text-white',
  },
  leave: {
    bn: 'ছুটি',
    en: 'Leave',
    short: { bn: 'ছু', en: 'Lv' },
    color: '#2563eb',
    pill: 'bg-blue-100 text-blue-800',
    solid: 'bg-blue-600 text-white',
  },
};

const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ── Helpers ── */

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

const emptyCounts = (): DayCounts => ({ present: 0, absent: 0, late: 0, leave: 0, total: 0 });

/** conic-gradient ring: green / amber / red / blue slices proportional to the day's counts */
function ringBackground(c: DayCounts): string {
  if (c.total === 0) return '#e5e7eb';
  const order: Status[] = ['present', 'late', 'leave', 'absent'];
  let acc = 0;
  const stops: string[] = [];
  for (const s of order) {
    if (c[s] === 0) continue;
    const start = (acc / c.total) * 100;
    acc += c[s];
    const end = (acc / c.total) * 100;
    stops.push(`${STATUS_META[s].color} ${start}% ${end}%`);
  }
  return `conic-gradient(${stops.join(', ')})`;
}

/* ── Component ── */

export default function AttendancePage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const num = (n: number | string) =>
    isBengali ? Number(n).toLocaleString('bn-BD', { useGrouping: false }) : String(n);

  const today = todayBdString();
  const thisMonth = today.slice(0, 7);

  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') ?? '';
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get('month') ?? '')
    ? (params.get('month') as string)
    : thisMonth;
  const [selectedDate, setSelectedDate] = useState<string>(today.slice(0, 7) === month ? today : '');

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function goMonth(target: string) {
    updateParam('month', target);
    setSelectedDate(target === thisMonth ? today : '');
  }

  /* ── Data ── */

  const classesRes = useApiGet<ClassesResponse | ClassOption[]>('/api/classes', []);
  const classes: ClassOption[] = useMemo(() => {
    const d = classesRes.data;
    if (!d) return FALLBACK_CLASSES;
    const arr = Array.isArray(d) ? d : d.items;
    if (!arr || arr.length === 0) return FALLBACK_CLASSES;
    return [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [classesRes.data]);

  const studentsRes = useApiGet<StudentsListResponse>(
    classId
      ? `/api/students?classId=${encodeURIComponent(classId)}&isActive=true&page=1&pageSize=300`
      : '',
    [classId],
  );

  const monthRes = useApiGet<MonthResponse>(
    classId ? `/api/attendance/month?classId=${encodeURIComponent(classId)}&month=${month}` : '',
    [classId, month],
  );

  const saveApi = useApi<{ success: boolean; saved?: number }>('POST');

  const students = studentsRes.data?.items ?? [];
  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) => {
        const ra = Number(a.roll ?? 0);
        const rb = Number(b.roll ?? 0);
        if (ra && rb && ra !== rb) return ra - rb;
        return a.studentId.localeCompare(b.studentId);
      }),
    [students],
  );

  // date -> studentId -> record
  const byDate = useMemo(() => {
    const map: Record<string, Record<string, AttendanceRecord>> = {};
    for (const r of monthRes.data?.items ?? []) {
      (map[r.date] ??= {})[r.studentId] = r;
    }
    return map;
  }, [monthRes.data]);

  const dayCounts = (date: string): DayCounts => {
    const c = emptyCounts();
    const recs = byDate[date];
    if (!recs) return c;
    for (const r of Object.values(recs)) {
      c[r.status] += 1;
      c.total += 1;
    }
    return c;
  };

  /* ── Calendar geometry ── */

  const [yearNum, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(yearNum, monthNum - 1, 1)).getUTCDay();
  const monthLabel = new Date(Date.UTC(yearNum, monthNum - 1, 1)).toLocaleDateString(
    isBengali ? 'bn-BD' : 'en-GB',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  );

  const dayStr = (d: number) => `${month}-${pad(d)}`;
  const weekdayOf = (d: number) => (firstWeekday + d - 1) % 7;

  /* ── Month summary ── */

  const monthSummary = useMemo(() => {
    let markedDays = 0;
    let present = 0;
    let late = 0;
    let absent = 0;
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const c = dayCounts(`${month}-${pad(d)}`);
      if (c.total === 0) continue;
      markedDays += 1;
      present += c.present;
      late += c.late;
      absent += c.absent;
      total += c.total;
    }
    const pct = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;
    return { markedDays, absent, pct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDate, month, daysInMonth]);

  /* ── Day editor (draft) ── */

  const [draft, setDraft] = useState<Record<string, { status: Status; note: string }>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const existing = byDate[selectedDate] ?? {};
    const next: Record<string, { status: Status; note: string }> = {};
    sortedStudents.forEach((s) => {
      const prev = existing[s.studentId];
      next[s.studentId] = { status: prev?.status ?? 'present', note: prev?.note ?? '' };
    });
    setDraft(next);
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, studentsRes.data, monthRes.data]);

  function setStatus(studentId: string, status: Status) {
    setDraft((d) => ({
      ...d,
      [studentId]: { ...(d[studentId] ?? { status: 'present', note: '' }), status },
    }));
    setSavedAt(null);
  }

  function setNote(studentId: string, note: string) {
    setDraft((d) => ({
      ...d,
      [studentId]: { ...(d[studentId] ?? { status: 'present', note: '' }), note },
    }));
    setSavedAt(null);
  }

  function markAll(status: Status) {
    const next = { ...draft };
    sortedStudents.forEach((s) => {
      next[s.studentId] = { status, note: next[s.studentId]?.note ?? '' };
    });
    setDraft(next);
    setSavedAt(null);
  }

  async function handleSave() {
    if (!classId || !selectedDate) return;
    setSubmitError(null);
    setSavedAt(null);
    const records = sortedStudents.map((s) => {
      const d = draft[s.studentId] ?? { status: 'present' as Status, note: '' };
      const r: { studentId: string; status: Status; note?: string } = {
        studentId: s.studentId,
        status: d.status,
      };
      if (d.note.trim()) r.note = d.note.trim();
      return r;
    });
    try {
      await saveApi.execute('/api/attendance/mark', { classId, date: selectedDate, records });
      setSavedAt(new Date().toISOString());
      await monthRes.execute();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : tr('সংরক্ষণ ব্যর্থ হয়েছে।', 'Save failed.'));
    }
  }

  const draftCounts = useMemo(() => {
    const c = emptyCounts();
    sortedStudents.forEach((s) => {
      const st = draft[s.studentId]?.status ?? 'present';
      c[st] += 1;
      c.total += 1;
    });
    return c;
  }, [draft, sortedStudents]);

  const isWaking = classesRes.isWaking || studentsRes.isWaking || monthRes.isWaking;
  const selectedMarked = selectedDate ? dayCounts(selectedDate).total > 0 : false;
  const weekdays = isBengali ? WEEKDAYS_BN : WEEKDAYS_EN;

  /* ── Render ── */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">{tr('ছাত্র উপস্থিতি', 'Student Attendance')}</h1>
        <p className="text-sm text-ink/70">
          {tr(
            'শ্রেণি বেছে ক্যালেন্ডারের যেকোনো দিনে ক্লিক করে উপস্থিতি নিন বা বদলান।',
            'Pick a class, then click any day on the calendar to take or edit attendance.',
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

      {/* Class + month controls */}
      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="att-class">
            {tr('শ্রেণি', 'Class')}
          </label>
          <select
            id="att-class"
            value={classId}
            onChange={(e) => {
              updateParam('classId', e.target.value);
              setSelectedDate(month === thisMonth ? today : '');
            }}
            className="input-field"
          >
            <option value="">{tr('শ্রেণি নির্বাচন করুন', 'Select class')}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {isBengali ? c.nameBn : c.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="label">{tr('মাস', 'Month')}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goMonth(shiftMonth(month, -1))}
              className="rounded border border-navy/30 px-3 py-2 text-navy hover:bg-navy/5"
              aria-label={tr('আগের মাস', 'Previous month')}
            >
              ‹
            </button>
            <div className="flex-1 rounded bg-navy/5 px-3 py-2 text-center text-sm font-semibold text-navy">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => goMonth(shiftMonth(month, 1))}
              disabled={month >= thisMonth}
              className="rounded border border-navy/30 px-3 py-2 text-navy hover:bg-navy/5 disabled:opacity-40"
              aria-label={tr('পরের মাস', 'Next month')}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {!classId && (
        <div className="card py-10 text-center text-ink/60">
          {tr('উপস্থিতি দেখতে একটি শ্রেণি নির্বাচন করুন।', 'Select a class to see its attendance.')}
        </div>
      )}

      {classId && (
        <>
          {/* Month summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <p className="text-2xl font-bold text-navy">{num(monthSummary.markedDays)}</p>
              <p className="text-xs text-ink/60">{tr('উপস্থিতি নেওয়া দিন', 'Days marked')}</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-700">
                {monthSummary.markedDays ? `${num(monthSummary.pct)}%` : '—'}
              </p>
              <p className="text-xs text-ink/60">{tr('গড় উপস্থিতি', 'Average attendance')}</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-600">{num(monthSummary.absent)}</p>
              <p className="text-xs text-ink/60">{tr('মোট অনুপস্থিতি', 'Total absences')}</p>
            </div>
          </div>

          {/* Calendar */}
          <div className="card">
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {STATUSES.map((s) => (
                <span key={s} className={'rounded-full px-2 py-0.5 font-medium ' + STATUS_META[s].pill}>
                  {tr(STATUS_META[s].bn, STATUS_META[s].en)}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekdays.map((w, i) => (
                <div
                  key={w}
                  className={
                    'pb-1 text-center text-[11px] font-semibold sm:text-xs ' +
                    (i === 5 ? 'text-red-500' : 'text-ink/60')
                  }
                >
                  {w}
                </div>
              ))}

              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const date = dayStr(d);
                const isFuture = date > today;
                const isToday = date === today;
                const isSelected = date === selectedDate;
                const c = dayCounts(date);
                const marked = c.total > 0;
                const isFriday = weekdayOf(d) === 5;
                const pct = marked ? Math.round(((c.present + c.late) / c.total) * 100) : 0;

                return (
                  <button
                    key={date}
                    type="button"
                    disabled={isFuture}
                    onClick={() => {
                      setSelectedDate(date);
                      setSavedAt(null);
                    }}
                    title={
                      marked
                        ? `${tr('উপস্থিত', 'Present')}: ${c.present + c.late}/${c.total}`
                        : tr('এখনো নেওয়া হয়নি', 'Not marked yet')
                    }
                    className={
                      'flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition ' +
                      (isSelected
                        ? 'border-navy bg-navy/5 ring-2 ring-navy '
                        : 'border-surface hover:border-navy/40 ') +
                      (isFuture ? 'cursor-not-allowed opacity-30 ' : '') +
                      (isFriday && !marked ? 'bg-red-50/40 ' : '')
                    }
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10"
                      style={{
                        background: marked
                          ? ringBackground(c)
                          : 'repeating-conic-gradient(#e5e7eb 0 10deg, transparent 10deg 20deg)',
                      }}
                    >
                      <span
                        className={
                          'flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm ' +
                          (isToday ? 'text-royal' : 'text-ink')
                        }
                      >
                        {num(d)}
                      </span>
                    </span>
                    <span className="mt-0.5 hidden text-[10px] text-ink/60 sm:block">
                      {marked ? `${num(pct)}%` : isFuture ? '' : '·'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day editor */}
          {selectedDate && (
            <div className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-navy">
                    {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString(isBengali ? 'bn-BD' : 'en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </h2>
                  <p className="text-xs text-ink/60">
                    {selectedMarked
                      ? tr('এই দিনের উপস্থিতি নেওয়া আছে, বদলাতে পারেন।', 'Already marked, you can edit it.')
                      : tr('এই দিনের উপস্থিতি এখনো নেওয়া হয়নি।', 'Not marked yet.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={sortedStudents.length === 0 || saveApi.isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {saveApi.isLoading ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ করুন', 'Save')}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <span key={s} className={'rounded-full px-2 py-0.5 text-xs font-medium ' + STATUS_META[s].pill}>
                      {tr(STATUS_META[s].bn, STATUS_META[s].en)}: {num(draftCounts[s])}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => markAll(s)}
                      className="rounded border border-navy/30 px-3 py-1 text-xs text-navy hover:bg-navy/5"
                    >
                      {tr(`সবাইকে ${STATUS_META[s].bn}`, `All ${STATUS_META[s].en}`)}
                    </button>
                  ))}
                </div>
              </div>

              {submitError && (
                <div className="rounded border-l-4 border-l-red-600 bg-red-50 p-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
              {savedAt && (
                <div className="rounded border-l-4 border-l-green-600 bg-green-50 p-3 text-sm text-green-800">
                  {tr('উপস্থিতি সংরক্ষিত হয়েছে।', 'Attendance saved.')}
                </div>
              )}

              {sortedStudents.length === 0 ? (
                <p className="py-8 text-center text-ink/60">
                  {tr('এই শ্রেণিতে কোনো সক্রিয় শিক্ষার্থী নেই।', 'No active students in this class.')}
                </p>
              ) : (
                <ul className="divide-y divide-surface">
                  {sortedStudents.map((s) => {
                    const d = draft[s.studentId] ?? { status: 'present' as Status, note: '' };
                    return (
                      <li key={s.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                            {s.roll !== undefined && s.roll !== '' ? num(s.roll) : '–'}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                            <p className="font-mono text-[11px] text-ink/50">{s.studentId}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {STATUSES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setStatus(s.studentId, st)}
                              className={
                                'rounded-lg px-3 py-1.5 text-xs font-medium transition ' +
                                (d.status === st
                                  ? STATUS_META[st].solid
                                  : 'bg-surface text-ink hover:bg-navy/10')
                              }
                            >
                              {tr(STATUS_META[st].bn, STATUS_META[st].en)}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={d.note}
                          onChange={(e) => setNote(s.studentId, e.target.value)}
                          placeholder={tr('ঐচ্ছিক নোট', 'Optional note')}
                          className="input-field md:w-44"
                          maxLength={120}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Heat-map: students × days */}
          {sortedStudents.length > 0 && monthSummary.markedDays > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="border-b border-surface px-4 py-3">
                <h2 className="text-base font-bold text-navy">
                  {tr('মাসের হিসাব (শিক্ষার্থী × দিন)', 'Month overview (student × day)')}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 min-w-[150px] bg-surface px-3 py-2 text-left">
                        {tr('শিক্ষার্থী', 'Student')}
                      </th>
                      {Array.from({ length: daysInMonth }).map((_, i) => (
                        <th
                          key={i}
                          className={
                            'px-1 py-2 text-center font-medium ' +
                            (weekdayOf(i + 1) === 5 ? 'text-red-500' : 'text-ink/60')
                          }
                        >
                          {num(i + 1)}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((s) => {
                      let marked = 0;
                      let attended = 0;
                      return (
                        <tr key={s.id} className="border-t border-surface">
                          <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-ink">
                            <span className="mr-1 text-ink/40">{s.roll ?? ''}</span>
                            {s.name}
                          </td>
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const rec = byDate[dayStr(i + 1)]?.[s.studentId];
                            if (rec) {
                              marked += 1;
                              if (rec.status === 'present' || rec.status === 'late') attended += 1;
                            }
                            return (
                              <td key={i} className="p-0.5 text-center">
                                {rec ? (
                                  <span
                                    title={rec.note || undefined}
                                    className={
                                      'inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ' +
                                      STATUS_META[rec.status].solid
                                    }
                                  >
                                    {isBengali
                                      ? STATUS_META[rec.status].short.bn
                                      : STATUS_META[rec.status].short.en}
                                  </span>
                                ) : (
                                  <span className="inline-block h-5 w-5 rounded bg-surface" />
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-1.5 text-center font-semibold text-navy">
                            {marked ? `${num(Math.round((attended / marked) * 100))}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
  }
