// src/features/admin/attendance/MyAttendancePage.tsx
// A teacher's own page: check in (present / late), log the classes taken today, see the month.
import { useMemo, useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi, useApiGet } from '../../../hooks/useApi';

/* ── Types ── */

type AttStatus = 'present' | 'absent' | 'late' | 'leave';
type LogStatus = 'assigned' | 'completed' | 'partial' | 'not_taken';

interface TeacherLite {
  id: string;
  name: string;
  designation?: string;
  subject?: string;
}

interface Att {
  date: string;
  status: AttStatus;
  checkInTime?: string;
  selfMarked?: boolean;
  note?: string;
}

interface ClassLog {
  id: string;
  date: string;
  classId: string;
  subject: string;
  period?: number;
  topic?: string;
  status: LogStatus;
  note?: string;
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

interface MeResponse {
  teacher: TeacherLite;
  today: string;
  now: string;
  attendance: Att | null;
  classes: ClassLog[];
}

interface MonthResponse {
  items: Att[];
  classes: ClassLog[];
  summary: Summary | null;
}

interface ClassOption {
  id: string;
  nameBn: string;
  nameEn: string;
  order?: number;
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

const ATT_META: Record<AttStatus, { bn: string; en: string; pill: string; solid: string }> = {
  present: { bn: 'উপস্থিত', en: 'Present', pill: 'bg-green-100 text-green-800', solid: 'bg-green-600 text-white' },
  absent: { bn: 'অনুপস্থিত', en: 'Absent', pill: 'bg-red-100 text-red-800', solid: 'bg-red-600 text-white' },
  late: { bn: 'দেরিতে', en: 'Late', pill: 'bg-amber-100 text-amber-800', solid: 'bg-amber-500 text-white' },
  leave: { bn: 'ছুটি', en: 'Leave', pill: 'bg-blue-100 text-blue-800', solid: 'bg-blue-600 text-white' },
};

const LOG_META: Record<LogStatus, { bn: string; en: string; pill: string; solid: string }> = {
  assigned: { bn: 'বাকি (অ্যাডমিন দিয়েছেন)', en: 'To do (assigned)', pill: 'bg-blue-100 text-blue-800', solid: 'bg-blue-600 text-white' },
  completed: { bn: 'সম্পূর্ণ', en: 'Completed', pill: 'bg-green-100 text-green-800', solid: 'bg-green-600 text-white' },
  partial: { bn: 'আংশিক', en: 'Partial', pill: 'bg-amber-100 text-amber-800', solid: 'bg-amber-500 text-white' },
  not_taken: { bn: 'নেওয়া হয়নি', en: 'Not taken', pill: 'bg-red-100 text-red-800', solid: 'bg-red-600 text-white' },
};

const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

interface LogForm {
  classId: string;
  subject: string;
  period: string;
  topic: string;
  status: LogStatus;
  note: string;
}

const emptyForm = (subject = ''): LogForm => ({
  classId: '',
  subject,
  period: '',
  topic: '',
  status: 'completed',
  note: '',
});

/* ── Component ── */

export default function MyAttendancePage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const num = (n: number | string) =>
    isBengali ? Number(n).toLocaleString('bn-BD', { useGrouping: false }) : String(n);

  const today = todayBdString();
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);

  const meRes = useApiGet<MeResponse>('/api/attendance/teachers/me', []);
  const monthRes = useApiGet<MonthResponse>(`/api/attendance/teachers/me/month?month=${month}`, [month]);
  const classesRes = useApiGet<{ items?: ClassOption[] } | ClassOption[]>('/api/classes', []);

  const classes: ClassOption[] = useMemo(() => {
    const d = classesRes.data;
    const arr = Array.isArray(d) ? d : d?.items;
    return arr && arr.length > 0 ? [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : FALLBACK_CLASSES;
  }, [classesRes.data]);
  const className = (id: string): string => {
    const c = classes.find((x) => x.id === id);
    return c ? (isBengali ? c.nameBn : c.nameEn) : id;
  };

  const checkInApi = useApi<{ success: boolean }>('POST');
  const addLogApi = useApi<{ success: boolean }>('POST');
  const editLogApi = useApi<{ success: boolean }>('PUT');
  const delLogApi = useApi<{ success: boolean }>('DELETE');

  const me = meRes.data;
  const teacher = me?.teacher;

  const [note, setNote] = useState('');
  const [form, setForm] = useState<LogForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const reload = async () => {
    await Promise.all([meRes.execute(), monthRes.execute()]);
  };

  async function checkIn(status: 'present' | 'late') {
    setMsg(null);
    try {
      await checkInApi.execute('/api/attendance/teachers/me/checkin', {
        status,
        note: note.trim() || undefined,
      });
      setMsg({ type: 'ok', text: tr('আপনার হাজিরা সংরক্ষিত হয়েছে।', 'Your attendance is saved.') });
      await reload();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : tr('ব্যর্থ হয়েছে।', 'Failed.') });
    }
  }

  async function saveLog() {
    setMsg(null);
    if (!form.classId || !form.subject.trim()) {
      setMsg({ type: 'err', text: tr('শ্রেণি ও বিষয় দিন।', 'Select a class and enter the subject.') });
      return;
    }
    const body = {
      classId: form.classId,
      subject: form.subject.trim(),
      period: form.period ? Number(form.period) : undefined,
      topic: form.topic.trim() || undefined,
      status: form.status,
      note: form.note.trim() || undefined,
    };
    try {
      if (editingId) {
        await editLogApi.execute(`/api/attendance/teachers/me/classes/${editingId}`, body);
      } else {
        await addLogApi.execute('/api/attendance/teachers/me/classes', { ...body, date: today });
      }
      setForm(emptyForm(teacher?.subject ?? ''));
      setEditingId(null);
      setMsg({ type: 'ok', text: tr('ক্লাস লগ সংরক্ষিত হয়েছে।', 'Class log saved.') });
      await reload();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : tr('ব্যর্থ হয়েছে।', 'Failed.') });
    }
  }

  /** Report an admin-assigned class: completed / partial / not taken */
  async function reportLog(l: ClassLog, status: LogStatus) {
    setMsg(null);
    try {
      await editLogApi.execute(`/api/attendance/teachers/me/classes/${l.id}`, {
        classId: l.classId,
        subject: l.subject,
        period: l.period,
        topic: l.topic,
        status,
        note: l.note,
      });
      await reload();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : tr('ব্যর্থ হয়েছে।', 'Failed.') });
    }
  }

  async function removeLog(id: string) {
    if (!window.confirm(tr('এই ক্লাস লগ মুছবেন?', 'Delete this class log?'))) return;
    try {
      await delLogApi.execute(`/api/attendance/teachers/me/classes/${id}`);
      await reload();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : tr('ব্যর্থ হয়েছে।', 'Failed.') });
    }
  }

  function startEdit(l: ClassLog) {
    setEditingId(l.id);
    setForm({
      classId: l.classId,
      subject: l.subject,
      period: l.period ? String(l.period) : '',
      topic: l.topic ?? '',
      status: l.status,
      note: l.note ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Month calendar ── */

  const attByDate = useMemo(() => {
    const m: Record<string, Att> = {};
    for (const a of monthRes.data?.items ?? []) m[a.date] = a;
    return m;
  }, [monthRes.data]);

  const logsByDate = useMemo(() => {
    const m: Record<string, ClassLog[]> = {};
    for (const l of monthRes.data?.classes ?? []) (m[l.date] ??= []).push(l);
    return m;
  }, [monthRes.data]);

  const [yearNum, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(yearNum, monthNum - 1, 1)).getUTCDay();
  const monthLabel = new Date(Date.UTC(yearNum, monthNum - 1, 1)).toLocaleDateString(
    isBengali ? 'bn-BD' : 'en-GB',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  );
  const summary = monthRes.data?.summary ?? null;
  const logDates = Object.keys(logsByDate).sort().reverse();
  const weekdays = isBengali ? WEEKDAYS_BN : WEEKDAYS_EN;

  const att = me?.attendance ?? null;
  const busy = checkInApi.isLoading || addLogApi.isLoading || editLogApi.isLoading || delLogApi.isLoading;

  /* ── Render ── */

  if (meRes.isLoading && !me) {
    return <div className="card py-10 text-center text-ink/60">{tr('লোড হচ্ছে…', 'Loading…')}</div>;
  }

  if (meRes.error && !me) {
    return (
      <div className="space-y-4">
        <h1 className="section-title">{tr('আমার হাজিরা', 'My Attendance')}</h1>
        <div className="card border-l-4 border-l-red-600 bg-red-50">
          <p className="text-sm text-red-700">{meRes.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">{tr('আমার হাজিরা', 'My Attendance')}</h1>
        {teacher && (
          <p className="text-sm text-ink/70">
            {teacher.name}
            {teacher.designation ? ` — ${teacher.designation}` : ''}
          </p>
        )}
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

      {/* Today: check-in */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-navy">
              {new Date(`${today}T00:00:00Z`).toLocaleDateString(isBengali ? 'bn-BD' : 'en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </h2>
            {att ? (
              <p className="mt-1 text-sm">
                <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + ATT_META[att.status].pill}>
                  {tr(ATT_META[att.status].bn, ATT_META[att.status].en)}
                </span>
                {att.checkInTime && (
                  <span className="ml-2 text-ink/60">
                    {tr('চেক-ইন', 'Checked in')}: {att.checkInTime}
                  </span>
                )}
                {att.selfMarked === false && (
                  <span className="ml-2 text-xs text-ink/50">{tr('(অ্যাডমিন দিয়েছেন)', '(marked by admin)')}</span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink/60">{tr('আজকের হাজিরা এখনো দেননি।', "You haven't checked in today.")}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => checkIn('present')}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {tr('উপস্থিত', 'Present')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => checkIn('late')}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {tr('দেরিতে', 'Late')}
            </button>
          </div>
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={tr('ঐচ্ছিক নোট (যেমন: দেরির কারণ)', 'Optional note (e.g. reason for being late)')}
          className="input-field"
          maxLength={200}
        />
      </div>

      {/* Today: class log form */}
      <div className="card space-y-4">
        <h2 className="text-base font-bold text-navy">
          {editingId ? tr('ক্লাস লগ সম্পাদনা', 'Edit class log') : tr('আজকের ক্লাস লিখুন', "Log today's class")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">{tr('শ্রেণি', 'Class')}</label>
            <select
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="input-field"
            >
              <option value="">{tr('নির্বাচন করুন', 'Select')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {isBengali ? c.nameBn : c.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{tr('বিষয়', 'Subject')}</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder={teacher?.subject || tr('যেমন: গণিত', 'e.g. Mathematics')}
              className="input-field"
              maxLength={80}
            />
          </div>
          <div>
            <label className="label">{tr('পিরিয়ড', 'Period')}</label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{tr('কী পড়ানো হলো (ঐচ্ছিক)', 'Topic covered (optional)')}</label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              className="input-field"
              maxLength={200}
            />
          </div>
          <div>
            <label className="label">{tr('নোট (ঐচ্ছিক)', 'Note (optional)')}</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="input-field"
              maxLength={300}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {(Object.keys(LOG_META) as LogStatus[]).filter((s) => s !== 'assigned').map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, status: s })}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition ' +
                  (form.status === s ? LOG_META[s].solid : 'bg-surface text-ink hover:bg-navy/10')
                }
              >
                {tr(LOG_META[s].bn, LOG_META[s].en)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm(teacher?.subject ?? ''));
                }}
                className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5"
              >
                {tr('বাতিল', 'Cancel')}
              </button>
            )}
            <button type="button" disabled={busy} onClick={saveLog} className="btn-primary disabled:opacity-50">
              {editingId ? tr('আপডেট', 'Update') : tr('ক্লাস যোগ করুন', 'Add class')}
            </button>
          </div>
        </div>

        {/* Today's logs */}
        {(me?.classes ?? []).length > 0 && (
          <ul className="divide-y divide-surface border-t border-surface">
            {(me?.classes ?? []).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <span className="font-medium text-ink">
                    {className(l.classId)} — {l.subject}
                  </span>
                  {l.period ? <span className="ml-2 text-xs text-ink/50">{tr('পিরিয়ড', 'P')} {num(l.period)}</span> : null}
                  {l.topic && <p className="text-xs text-ink/60">{l.topic}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {l.status === 'assigned' ? (
                    <>
                      {(['completed', 'partial', 'not_taken'] as LogStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={busy}
                          onClick={() => reportLog(l, s)}
                          className={'rounded-lg px-2 py-1 text-xs font-medium disabled:opacity-50 ' + LOG_META[s].solid}
                        >
                          {tr(LOG_META[s].bn, LOG_META[s].en)}
                        </button>
                      ))}
                    </>
                  ) : (
                    <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + LOG_META[l.status].pill}>
                      {tr(LOG_META[l.status].bn, LOG_META[l.status].en)}
                    </span>
                  )}
                  <button type="button" onClick={() => startEdit(l)} className="text-xs text-royal hover:underline">
                    {tr('সম্পাদনা', 'Edit')}
                  </button>
                  <button type="button" onClick={() => removeLog(l.id)} className="text-xs text-red-600 hover:underline">
                    {tr('মুছুন', 'Delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Month */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded border border-navy/30 px-3 py-2 text-navy hover:bg-navy/5"
          >
            ‹
          </button>
          <div className="flex-1 rounded bg-navy/5 px-3 py-2 text-center text-sm font-semibold text-navy">{monthLabel}</div>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= thisMonth}
            className="rounded border border-navy/30 px-3 py-2 text-navy hover:bg-navy/5 disabled:opacity-40"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            { k: 'present', label: tr('উপস্থিত', 'Present'), v: summary?.present ?? 0, c: 'text-green-700' },
            { k: 'late', label: tr('দেরি', 'Late'), v: summary?.late ?? 0, c: 'text-amber-600' },
            { k: 'absent', label: tr('অনুপস্থিত', 'Absent'), v: summary?.absent ?? 0, c: 'text-red-600' },
            { k: 'leave', label: tr('ছুটি', 'Leave'), v: summary?.leave ?? 0, c: 'text-blue-600' },
            { k: 'classes', label: tr('মোট ক্লাস', 'Classes'), v: summary?.classesTotal ?? 0, c: 'text-navy' },
            {
              k: 'pct',
              label: tr('সম্পূর্ণ ক্লাস', 'Completed'),
              v: summary ? `${num(summary.completionPercent)}%` : '—',
              c: 'text-navy',
            },
          ].map((x) => (
            <div key={x.k} className="rounded-lg bg-surface p-2 text-center">
              <p className={'text-lg font-bold ' + x.c}>{typeof x.v === 'number' ? num(x.v) : x.v}</p>
              <p className="text-[11px] text-ink/60">{x.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekdays.map((w, i) => (
            <div key={w} className={'pb-1 text-center text-[11px] font-semibold ' + (i === 5 ? 'text-red-500' : 'text-ink/60')}>
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`b${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const date = `${month}-${pad(d)}`;
            const a = attByDate[date];
            const nLogs = logsByDate[date]?.length ?? 0;
            return (
              <div
                key={date}
                title={a ? tr(ATT_META[a.status].bn, ATT_META[a.status].en) : ''}
                className={
                  'flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold ' +
                  (a ? ATT_META[a.status].solid : date > today ? 'bg-surface/40 text-ink/30' : 'bg-surface text-ink/60') +
                  (date === today ? ' ring-2 ring-navy' : '')
                }
              >
                <span>{num(d)}</span>
                {nLogs > 0 && <span className="text-[9px] font-normal opacity-90">{num(nLogs)} {tr('ক্লাস', 'cl.')}</span>}
              </div>
            );
          })}
        </div>

        {logDates.length > 0 && (
          <div className="border-t border-surface pt-3">
            <h3 className="mb-2 text-sm font-bold text-navy">{tr('এই মাসের ক্লাস লগ', "This month's class logs")}</h3>
            <div className="space-y-3">
              {logDates.map((date) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-ink/60">{date}</p>
                  <ul className="mt-1 space-y-1">
                    {logsByDate[date].map((l) => (
                      <li key={l.id} className="flex items-center justify-between text-sm">
                        <span>
                          {className(l.classId)} — {l.subject}
                          {l.period ? ` (${tr('পি', 'P')}${num(l.period)})` : ''}
                        </span>
                        <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + LOG_META[l.status].pill}>
                          {tr(LOG_META[l.status].bn, LOG_META[l.status].en)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
             }
