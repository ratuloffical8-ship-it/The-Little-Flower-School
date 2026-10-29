// src/features/admin/attendance/AttendancePage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi, useApiGet } from '../../../hooks/useApi';

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
  total: number;
  page: number;
  pageSize: number;
}

type Status = 'present' | 'absent' | 'late' | 'leave';

interface AttendanceRecord {
  studentId: string;
  status: Status;
  note?: string;
}

interface AttendanceDayResponse {
  items: AttendanceRecord[];
}

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

const STATUS_LABEL: Record<Status, { bn: string; en: string; pill: string }> = {
  present: { bn: 'উপস্থিত', en: 'Present', pill: 'bg-green-100 text-green-800' },
  absent: { bn: 'অনুপস্থিত', en: 'Absent', pill: 'bg-red-100 text-red-800' },
  late: { bn: 'দেরিতে', en: 'Late', pill: 'bg-amber-100 text-amber-800' },
  leave: { bn: 'ছুটি', en: 'Leave', pill: 'bg-blue-100 text-blue-800' },
};

function todayBdString(): string {
  const now = new Date();
  const bd = new Date(now.getTime() + (6 * 60 - now.getTimezoneOffset()) * 60000);
  return bd.toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') ?? '';
  const date = params.get('date') ?? todayBdString();

  const classesRes = useApiGet<ClassesResponse | ClassOption[]>('/api/classes', []);
  const classes: ClassOption[] = useMemo(() => {
    const d = classesRes.data;
    if (!d) return FALLBACK_CLASSES;
    const arr = Array.isArray(d) ? d : d.items;
    if (!arr || arr.length === 0) return FALLBACK_CLASSES;
    return [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [classesRes.data]);

  const studentsQS = useMemo(() => {
    if (!classId) return '';
    const sp = new URLSearchParams();
    sp.set('classId', classId);
    sp.set('isActive', 'true');
    sp.set('page', '1');
    sp.set('pageSize', '300');
    return sp.toString();
  }, [classId]);

  const studentsRes = useApiGet<StudentsListResponse>(
    studentsQS ? `/api/students?${studentsQS}` : '',
    [studentsQS],
  );

  const attendanceRes = useApiGet<AttendanceDayResponse>(
    classId && date ? `/api/attendance?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}` : '',
    [classId, date],
  );

  const [draft, setDraft] = useState<Record<string, { status: Status; note: string }>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const saveApi = useApi<{ success: boolean; saved?: number }>('POST');

  useEffect(() => {
    const students = studentsRes.data?.items ?? [];
    const existing = attendanceRes.data?.items ?? [];
    const existingByStu = new Map(existing.map((e) => [e.studentId, e]));
    const next: Record<string, { status: Status; note: string }> = {};
    students.forEach((s) => {
      const prev = existingByStu.get(s.studentId);
      next[s.studentId] = {
        status: prev?.status ?? 'present',
        note: prev?.note ?? '',
      };
    });
    setDraft(next);
    setSavedAt(null);
    setSubmitError(null);
  }, [studentsRes.data, attendanceRes.data]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function setStatus(studentId: string, status: Status) {
    setDraft((d) => ({ ...d, [studentId]: { ...(d[studentId] ?? { status: 'present', note: '' }), status } }));
  }

  function setNote(studentId: string, note: string) {
    setDraft((d) => ({ ...d, [studentId]: { ...(d[studentId] ?? { status: 'present', note: '' }), note } }));
  }

  function markAll(status: Status) {
    const students = studentsRes.data?.items ?? [];
    const next: Record<string, { status: Status; note: string }> = { ...draft };
    students.forEach((s) => {
      next[s.studentId] = { status, note: next[s.studentId]?.note ?? '' };
    });
    setDraft(next);
  }

  async function handleSave() {
    if (!classId || !date) return;
    setSubmitError(null);
    setSavedAt(null);
    const students = studentsRes.data?.items ?? [];
    const records = students.map((s) => {
      const d = draft[s.studentId] ?? { status: 'present' as Status, note: '' };
      const r: AttendanceRecord = { studentId: s.studentId, status: d.status };
      if (d.note.trim()) r.note = d.note.trim();
      return r;
    });
    try {
      await saveApi.execute('/api/attendance/mark', { classId, date, records });
      setSavedAt(new Date().toISOString());
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : tr('সংরক্ষণ ব্যর্থ হয়েছে।', 'Save failed.'),
      );
    }
  }

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

  const summary = useMemo(() => {
    const base: Record<Status, number> = { present: 0, absent: 0, late: 0, leave: 0 };
    sortedStudents.forEach((s) => {
      const st = draft[s.studentId]?.status ?? 'present';
      base[st] += 1;
    });
    return base;
  }, [draft, sortedStudents]);

  const isWaking = classesRes.isWaking || studentsRes.isWaking || attendanceRes.isWaking;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">{tr('উপস্থিতি', 'Attendance')}</h1>
        <p className="text-sm text-ink/70">
          {tr('শ্রেণি ও তারিখ নির্বাচন করে উপস্থিতি লিপিবদ্ধ করুন।', 'Select a class and date to mark attendance.')}
        </p>
      </div>

      {isWaking && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50">
          <p className="text-sm text-amber-900">
            {tr('সার্ভার চালু হচ্ছে, দয়া করে অপেক্ষা করুন…', 'Server is waking up, please wait…')}
          </p>
        </div>
      )}

      <div className="card grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="att-class">{tr('শ্রেণি', 'Class')}</label>
          <select
            id="att-class"
            value={classId}
            onChange={(e) => updateParam('classId', e.target.value)}
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
          <label className="label" htmlFor="att-date">{tr('তারিখ', 'Date')}</label>
          <input
            id="att-date"
            type="date"
            value={date}
            max={todayBdString()}
            onChange={(e) => updateParam('date', e.target.value)}
            className="input-field"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!classId || !date || sortedStudents.length === 0 || saveApi.isLoading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {saveApi.isLoading ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('উপস্থিতি সংরক্ষণ', 'Save attendance')}
          </button>
        </div>
      </div>

      {classId && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              {STATUSES.map((s) => (
                <span
                  key={s}
                  className={'rounded-full px-2 py-0.5 text-xs font-medium ' + STATUS_LABEL[s].pill}
                >
                  {tr(STATUS_LABEL[s].bn, STATUS_LABEL[s].en)}: {summary[s]}
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
                  {tr(`সবাইকে ${STATUS_LABEL[s].bn}`, `Mark all ${STATUS_LABEL[s].en}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}
      {savedAt && (
        <div className="card border-l-4 border-l-green-600 bg-green-50">
          <p className="text-sm text-green-800">
            {tr('উপস্থিতি সংরক্ষিত হয়েছে।', 'Attendance saved.')}
          </p>
        </div>
      )}

      {classId && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface text-left text-ink">
                <tr>
                  <th className="px-4 py-3 font-semibold">{tr('রোল', 'Roll')}</th>
                  <th className="px-4 py-3 font-semibold">{tr('শিক্ষার্থী আইডি', 'Student ID')}</th>
                  <th className="px-4 py-3 font-semibold">{tr('নাম', 'Name')}</th>
                  <th className="px-4 py-3 font-semibold">{tr('অবস্থা', 'Status')}</th>
                  <th className="px-4 py-3 font-semibold">{tr('নোট', 'Note')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-ink/60">
                      {tr('এই শ্রেণিতে কোনো সক্রিয় শিক্ষার্থী নেই।', 'No active students in this class.')}
                    </td>
                  </tr>
                )}
                {sortedStudents.map((s) => {
                  const d = draft[s.studentId] ?? { status: 'present' as Status, note: '' };
                  return (
                    <tr key={s.id} className="border-t border-surface">
                      <td className="px-4 py-3">{s.roll ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-navy">{s.studentId}</td>
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {STATUSES.map((st) => {
                            const active = d.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setStatus(s.studentId, st)}
                                className={
                                  'rounded px-2 py-1 text-xs transition ' +
                                  (active
                                    ? STATUS_LABEL[st].pill + ' ring-2 ring-navy'
                                    : 'bg-surface text-ink hover:bg-navy/10')
                                }
                              >
                                {tr(STATUS_LABEL[st].bn, STATUS_LABEL[st].en)}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={d.note}
                          onChange={(e) => setNote(s.studentId, e.target.value)}
                          placeholder={tr('ঐচ্ছিক নোট', 'Optional note')}
                          className="input-field"
                          maxLength={120}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
           }
