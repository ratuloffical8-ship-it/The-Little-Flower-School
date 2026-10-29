// src/features/admin/exams/ResultsEntryPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi, useApiGet } from '../../../hooks/useApi';

interface ExamSubject {
  name: string;
  fullMarks: number;
  passMarks?: number;
  isOptional?: boolean;
}

interface ExamRecord {
  id: string;
  name: string;
  classId: string;
  sessionId: string;
  subjects: ExamSubject[];
  published?: boolean;
}

interface ResultSubject {
  name: string;
  marks: number | null;
}

interface ResultListItem {
  studentId: string;
  studentName?: string;
  roll?: number | string;
  subjects: ResultSubject[];
  total?: number;
  percentage?: number;
  gpa?: number;
  grade?: string;
  passed?: boolean;
}

interface ResultsResponse {
  exam: ExamRecord;
  items: ResultListItem[];
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

type DraftRow = {
  name: string;
  roll?: number | string;
  marks: Record<string, string>; // subject -> string ('' => null/absent)
};

export default function ResultsEntryPage() {
  const { examId } = useParams<{ examId: string }>();
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const resultsRes = useApiGet<ResultsResponse>(
    examId ? `/api/results/exam/${examId}` : '',
    [examId],
  );

  const exam = resultsRes.data?.exam ?? null;

  const studentsRes = useApiGet<StudentsListResponse>(
    exam
      ? `/api/students?classId=${encodeURIComponent(exam.classId)}&isActive=true&page=1&pageSize=300`
      : '',
    [exam?.classId],
  );

  const saveApi = useApi<{ success: boolean; saved?: number }>('PUT');

  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!exam) return;
    const students = studentsRes.data?.items ?? [];
    const existing = resultsRes.data?.items ?? [];
    const existingByStu = new Map(existing.map((r) => [r.studentId, r]));

    const next: Record<string, DraftRow> = {};
    students.forEach((s) => {
      const prev = existingByStu.get(s.studentId);
      const marks: Record<string, string> = {};
      exam.subjects.forEach((sub) => {
        const m = prev?.subjects.find((x) => x.name === sub.name);
        marks[sub.name] = m && m.marks != null ? String(m.marks) : '';
      });
      next[s.studentId] = {
        name: s.name,
        roll: s.roll,
        marks,
      };
    });
    setDraft(next);
    setSavedAt(null);
    setSubmitError(null);
  }, [exam, studentsRes.data, resultsRes.data]);

  const sortedIds = useMemo(() => {
    const students = studentsRes.data?.items ?? [];
    return [...students]
      .sort((a, b) => {
        const ra = Number(a.roll ?? 0);
        const rb = Number(b.roll ?? 0);
        if (ra && rb && ra !== rb) return ra - rb;
        return a.studentId.localeCompare(b.studentId);
      })
      .map((s) => s.studentId);
  }, [studentsRes.data]);

  function setMark(studentId: string, subject: string, value: string) {
    setDraft((d) => {
      const row = d[studentId] ?? { name: '', marks: {} };
      return { ...d, [studentId]: { ...row, marks: { ...row.marks, [subject]: value } } };
    });
  }

  function validate(): string | null {
    if (!exam) return null;
    for (const sid of sortedIds) {
      const row = draft[sid];
      if (!row) continue;
      for (const sub of exam.subjects) {
        const raw = (row.marks[sub.name] ?? '').trim();
        if (raw === '') continue; // absent
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > sub.fullMarks) {
          return tr(
            `${row.name} (${sid}) · ${sub.name}: ০ থেকে ${sub.fullMarks} এর মধ্যে হতে হবে।`,
            `${row.name} (${sid}) · ${sub.name}: must be 0 to ${sub.fullMarks}.`,
          );
        }
      }
    }
    return null;
  }

  async function handleSave() {
    if (!exam || !examId) return;
    const v = validate();
    if (v) {
      setSubmitError(v);
      setSavedAt(null);
      return;
    }
    setSubmitError(null);
    setSavedAt(null);

    const entries = sortedIds.map((sid) => {
      const row = draft[sid];
      const marks: Record<string, number | null> = {};
      exam.subjects.forEach((sub) => {
        const raw = (row?.marks[sub.name] ?? '').trim();
        marks[sub.name] = raw === '' ? null : Number(raw);
      });
      return { studentId: sid, marks };
    });

    try {
      await saveApi.execute(`/api/results/exam/${examId}`, { entries });
      setSavedAt(new Date().toISOString());
      resultsRes.execute();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : tr('সংরক্ষণ ব্যর্থ হয়েছে।', 'Save failed.'),
      );
    }
  }

  if (resultsRes.isLoading && !exam) {
    return (
      <div className="card">
        <p className="text-ink/60">{tr('লোড হচ্ছে…', 'Loading…')}</p>
      </div>
    );
  }

  if (resultsRes.error && !exam) {
    return (
      <div className="space-y-4">
        <Link to="/admine/exams" className="text-sm text-navy underline">
          ← {tr('তালিকায় ফিরে যান', 'Back to list')}
        </Link>
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">
            {tr('পরীক্ষা লোড করা যায়নি।', 'Could not load the exam.')}
          </p>
          <button
            type="button"
            onClick={() => resultsRes.execute()}
            className="mt-2 text-sm text-navy underline"
          >
            {tr('পুনরায় চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const students = studentsRes.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admine/exams" className="text-sm text-navy underline">
            ← {tr('তালিকায় ফিরে যান', 'Back to list')}
          </Link>
          <h1 className="section-title mt-2">{exam.name}</h1>
          <p className="text-sm text-ink/70">
            {tr('শ্রেণি', 'Class')}: {exam.classId} · {tr('সেশন', 'Session')}: {exam.sessionId} ·{' '}
            {exam.published ? tr('প্রকাশিত', 'Published') : tr('খসড়া', 'Draft')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveApi.isLoading || students.length === 0}
          className="btn-primary disabled:opacity-50"
        >
          {saveApi.isLoading ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('নম্বর সংরক্ষণ', 'Save marks')}
        </button>
      </div>

      {(studentsRes.isWaking || resultsRes.isWaking) && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50">
          <p className="text-sm text-amber-900">
            {tr('সার্ভার চালু হচ্ছে…', 'Server is waking up…')}
          </p>
        </div>
      )}

      {submitError && (
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}
      {savedAt && (
        <div className="card border-l-4 border-l-green-600 bg-green-50">
          <p className="text-sm text-green-800">{tr('নম্বর সংরক্ষিত হয়েছে।', 'Marks saved.')}</p>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface text-left text-ink">
              <tr>
                <th className="px-4 py-3 font-semibold">{tr('রোল', 'Roll')}</th>
                <th className="px-4 py-3 font-semibold">{tr('শিক্ষার্থী আইডি', 'Student ID')}</th>
                <th className="px-4 py-3 font-semibold">{tr('নাম', 'Name')}</th>
                {exam.subjects.map((sub) => (
                  <th key={sub.name} className="px-4 py-3 font-semibold">
                    {sub.name}
                    <span className="ml-1 text-xs font-normal text-ink/60">
                      /{sub.fullMarks}
                      {sub.isOptional ? ' · ' + tr('ঐচ্ছিক', 'opt') : ''}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan={3 + exam.subjects.length} className="px-4 py-10 text-center text-ink/60">
                    {tr('এই শ্রেণিতে কোনো সক্রিয় শিক্ষার্থী নেই।', 'No active students in this class.')}
                  </td>
                </tr>
              )}
              {sortedIds.map((sid) => {
                const row = draft[sid];
                if (!row) return null;
                return (
                  <tr key={sid} className="border-t border-surface">
                    <td className="px-4 py-3">{row.roll ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-navy">{sid}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    {exam.subjects.map((sub) => (
                      <td key={sub.name} className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={sub.fullMarks}
                          step="0.01"
                          value={row.marks[sub.name] ?? ''}
                          onChange={(e) => setMark(sid, sub.name, e.target.value)}
                          placeholder={tr('অনুপস্থিত', 'Absent')}
                          className="input-field w-24"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink/60">
        {tr(
          'খালি রাখলে সেই বিষয়ে অনুপস্থিত হিসেবে ধরা হবে।',
          'Leaving a cell empty marks the student absent in that subject.',
        )}
      </p>
    </div>
  );
  }
