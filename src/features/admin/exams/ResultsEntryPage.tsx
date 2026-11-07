// src/features/admin/exams/ResultsEntryPage.tsx
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi, useApiGet } from '../../../hooks/useApi';
import PrintOverlay from '@/components/PrintOverlay';
import MarksheetSheet, { type MarksheetData } from '@/components/MarksheetSheet';
import { txt } from '@/utils/admissionForm';
import { classLabel } from '@/utils/classes';
import { isCoreSubject } from '@/utils/grading';

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
  fullMarks: number;
  marks: number | null;
  grade: string;
  gradePoint: number;
  passed?: boolean;
  isOptional?: boolean;
}

interface ResultListItem {
  studentId: string;
  subjects: ResultSubject[];
  total: number;
  fullTotal: number;
  percentage: number;
  gpa: number;
  grade: string;
  passed: boolean;
  promoted?: boolean;
  coreFailed?: boolean;
  failedSubjects?: string[];
  needsDecision?: boolean;
  decision?: 'promoted' | 'failed';
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
}

interface StudentsListResponse {
  items: StudentListItem[];
}

export default function ResultsEntryPage() {
  const { examId } = useParams<{ examId: string }>();
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const resultsRes = useApiGet<ResultsResponse>(examId ? `/api/results/exam/${examId}` : '', [examId]);
  const exam = resultsRes.data?.exam ?? null;

  const studentsRes = useApiGet<StudentsListResponse>(
    exam
      ? `/api/students?classId=${encodeURIComponent(exam.classId)}&isActive=true&page=1&pageSize=500`
      : '',
    [exam?.classId],
  );

  const saveApi = useApi<{ success: boolean; saved?: number }>('PUT');
  const studentApi = useApi<Record<string, unknown>>('GET');
  const decideApi = useApi<{ success: boolean }>('PATCH');

  const [selected, setSelected] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [absent, setAbsent] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheet, setSheet] = useState<MarksheetData | null>(null);

  const results = useMemo(() => {
    const m = new Map<string, ResultListItem>();
    (resultsRes.data?.items ?? []).forEach((r) => m.set(r.studentId, r));
    return m;
  }, [resultsRes.data]);

  const students = useMemo(() => {
    return [...(studentsRes.data?.items ?? [])].sort((a, b) => {
      const ra = Number(a.roll ?? 0);
      const rb = Number(b.roll ?? 0);
      if (ra && rb && ra !== rb) return ra - rb;
      return a.studentId.localeCompare(b.studentId);
    });
  }, [studentsRes.data]);

  const doneCount = students.filter((s) => results.has(s.studentId)).length;
  const pendingDecision = students.filter((s) => results.get(s.studentId)?.needsDecision).length;

  async function decide(studentId: string, decision: 'promoted' | 'failed') {
    if (!examId) return;
    setError(null);
    try {
      await decideApi.execute(`/api/results/exam/${examId}/student/${studentId}/decision`, { decision });
      resultsRes.execute();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('সিদ্ধান্ত সংরক্ষণ ব্যর্থ হয়েছে।', 'Could not save the decision.'));
    }
  }
  const current = students.find((s) => s.studentId === selected) ?? null;

  function openStudent(studentId: string) {
    if (!exam) return;
    const prev = results.get(studentId);
    const nextInputs: Record<string, string> = {};
    const nextAbsent: Record<string, boolean> = {};
    exam.subjects.forEach((sub) => {
      const m = prev?.subjects.find((x) => x.name === sub.name);
      if (prev && m) {
        nextAbsent[sub.name] = m.marks === null;
        nextInputs[sub.name] = m.marks === null ? '' : String(m.marks);
      } else {
        nextAbsent[sub.name] = false;
        nextInputs[sub.name] = '';
      }
    });
    setInputs(nextInputs);
    setAbsent(nextAbsent);
    setError(null);
    setNotice(null);
    setSelected(studentId);
  }

  function validateCurrent(): string | null {
    if (!exam) return null;
    for (const sub of exam.subjects) {
      if (absent[sub.name]) continue;
      const raw = (inputs[sub.name] ?? '').trim();
      if (raw === '') {
        return tr(
          `"${sub.name}" এর নম্বর দিন, অথবা অনুপস্থিত টিক দিন।`,
          `Enter marks for "${sub.name}" or tick Absent.`,
        );
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > sub.fullMarks) {
        return tr(
          `"${sub.name}": ০ থেকে ${sub.fullMarks} এর মধ্যে হতে হবে।`,
          `"${sub.name}": must be between 0 and ${sub.fullMarks}.`,
        );
      }
    }
    return null;
  }

  async function save(goNext: boolean) {
    if (!exam || !examId || !current) return;
    const v = validateCurrent();
    if (v) {
      setError(v);
      setNotice(null);
      return;
    }
    setError(null);
    const marks: Record<string, number | null> = {};
    exam.subjects.forEach((sub) => {
      marks[sub.name] = absent[sub.name] ? null : Number((inputs[sub.name] ?? '').trim());
    });
    try {
      await saveApi.execute(`/api/results/exam/${examId}`, {
        entries: [{ studentId: current.studentId, marks }],
      });
      resultsRes.execute();
      setNotice(tr('নম্বর সংরক্ষিত হয়েছে।', 'Marks saved.'));
      if (goNext) {
        const idx = students.findIndex((s) => s.studentId === current.studentId);
        const rest = [...students.slice(idx + 1), ...students.slice(0, idx)];
        const next = rest.find((s) => !results.has(s.studentId)) ?? rest[0];
        if (next && next.studentId !== current.studentId) openStudent(next.studentId);
        else setSelected(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('সংরক্ষণ ব্যর্থ হয়েছে।', 'Save failed.'));
    }
  }

  async function showMarksheet(studentId: string) {
    const r = results.get(studentId);
    if (!r || !exam) return;
    setError(null);
    try {
      const st = await studentApi.execute(`/api/students/${studentId}`);
      const g = (st.guardian ?? {}) as Record<string, unknown>;
      const app = (st.application ?? {}) as Record<string, unknown>;
      const ag = (app.guardian ?? {}) as Record<string, unknown>;
      const docs = (app.documents ?? {}) as Record<string, unknown>;
      setSheet({
        examName: exam.name,
        student: {
          studentId,
          nameBn: txt(st.nameBn, st.name),
          nameEn: txt(st.nameEn),
          classId: txt(st.classId, exam.classId),
          sessionId: txt(st.sessionId, exam.sessionId),
          roll: txt(st.roll),
          fatherName: txt(ag.fatherName, g.fatherName),
          motherName: txt(ag.motherName, g.motherName),
          address: txt(ag.presentAddress, g.presentAddress, g.address),
          dateOfBirth: txt(st.dateOfBirth, (app.student as Record<string, unknown> | undefined)?.dateOfBirth),
          photo: txt(typeof docs.photo === 'string' ? docs.photo : '', st.photo),
        },
        subjects: r.subjects,
        total: r.total,
        fullTotal: r.fullTotal,
        percentage: r.percentage,
        gpa: r.gpa,
        grade: r.grade,
        passed: r.passed,
        promoted: r.promoted,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('মার্কশিট তৈরি করা যায়নি।', 'Could not build the marksheet.'));
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
          <p className="text-sm text-red-700">{tr('পরীক্ষা লোড করা যায়নি।', 'Could not load the exam.')}</p>
          <button type="button" onClick={() => resultsRes.execute()} className="mt-2 text-sm text-navy underline">
            {tr('পুনরায় চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admine/exams" className="text-sm text-navy underline">
          ← {tr('তালিকায় ফিরে যান', 'Back to list')}
        </Link>
        <h1 className="section-title mt-2">{exam.name}</h1>
        <p className="text-sm text-ink/70">
          {classLabel(exam.classId, isBengali)} · {tr('সেশন', 'Session')}: {exam.sessionId} ·{' '}
          {exam.published ? tr('প্রকাশিত', 'Published') : tr('খসড়া', 'Draft')}
        </p>
      </div>

      {(studentsRes.isWaking || resultsRes.isWaking) && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50">
          <p className="text-sm text-amber-900">{tr('সার্ভার চালু হচ্ছে…', 'Server is waking up…')}</p>
        </div>
      )}

      {error && !current && (
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-navy">
            {tr('নম্বর দেওয়া হয়েছে', 'Marks entered')}: {doneCount}/{students.length}
          </p>
          {!exam.published && doneCount > 0 && (
            <Link to="/admine/exams" className="text-sm text-royal underline">
              {tr('এখন "প্রকাশ" চাপুন, তাহলে অভিভাবকরা ফলাফল দেখবে', 'Now press "Publish" so parents can see results')}
            </Link>
          )}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-surface">
          <div
            className="h-full bg-royal"
            style={{ width: `${students.length ? Math.round((doneCount / students.length) * 100) : 0}%` }}
          />
        </div>
      </div>

      {pendingDecision > 0 && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50 text-sm text-amber-900">
          {tr(
            `${pendingDecision} জন শিক্ষার্থী কিছু বিষয়ে ফেল করেছে। নিচে "বিবেচনায় পাস" বা "ফেল রাখুন" বেছে নিন। সিদ্ধান্ত না দিলে তাকে ফেল দেখানো হবে।`,
            `${pendingDecision} student(s) failed some subjects. Choose "Pass by consideration" or "Keep fail" below. Until decided, they show as failed.`,
          )}
        </div>
      )}

      <div className="card divide-y divide-surface p-0">
        {students.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink/60">
            {tr('এই শ্রেণিতে কোনো সক্রিয় শিক্ষার্থী নেই।', 'No active students in this class.')}
          </p>
        )}
        {students.map((s) => {
          const r = results.get(s.studentId);
          return (
            <div key={s.studentId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {s.roll ?? '—'}. {s.name}
                </p>
                <p className="font-mono text-xs text-ink/50">{s.studentId}</p>
                {r ? (
                  <>
                    <p className="text-xs text-ink/70">
                      {tr('প্রাপ্ত', 'Total')}: {r.total}/{r.fullTotal} · GPA {r.gpa.toFixed(2)} ({r.grade})
                    </p>
                    {r.coreFailed ? (
                      <p className="text-xs font-semibold text-red-700">
                        {tr('অনুত্তীর্ণ — বাংলা/ইংরেজি/গণিতে ফেল: ', 'Failed — core subject failed: ')}
                        {(r.failedSubjects ?? []).filter(isCoreSubject).join(', ')}
                      </p>
                    ) : r.passed && r.promoted ? (
                      <p className="text-xs font-semibold text-green-700">
                        {tr('বিবেচনায় উত্তীর্ণ', 'Promoted by consideration')} ({(r.failedSubjects ?? []).join(', ')}{' '}
                        {tr('ফেল', 'failed')})
                      </p>
                    ) : r.passed ? (
                      <p className="text-xs font-semibold text-green-700">{tr('উত্তীর্ণ', 'Passed')}</p>
                    ) : (
                      <p className="text-xs font-semibold text-red-700">
                        {r.needsDecision
                          ? tr('সিদ্ধান্ত বাকি — ফেল: ', 'Decision pending — failed: ')
                          : tr('অনুত্তীর্ণ — ফেল: ', 'Failed — ')}
                        {(r.failedSubjects ?? []).join(', ')}
                      </p>
                    )}
                    {r.failedSubjects && r.failedSubjects.length > 0 && !r.coreFailed && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {!(r.passed && r.promoted) && (
                          <button
                            type="button"
                            disabled={decideApi.isLoading}
                            onClick={() => void decide(s.studentId, 'promoted')}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                          >
                            {tr('বিবেচনায় পাস', 'Pass by consideration')}
                          </button>
                        )}
                        {!(r.decision === 'failed') && (
                          <button
                            type="button"
                            disabled={decideApi.isLoading}
                            onClick={() => void decide(s.studentId, 'failed')}
                            className="rounded border border-red-500 px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
                          >
                            {tr('ফেল রাখুন', 'Keep fail')}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-amber-700">{tr('নম্বর বাকি', 'Not entered')}</p>
                )}
              </div>
              <div className="flex gap-2">
                {r && (
                  <button
                    type="button"
                    onClick={() => void showMarksheet(s.studentId)}
                    disabled={studentApi.isLoading}
                    className="rounded border border-navy/30 px-3 py-1.5 text-sm text-navy"
                  >
                    {tr('মার্কশিট', 'Marksheet')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openStudent(s.studentId)}
                  className="rounded bg-royal px-3 py-1.5 text-sm font-medium text-white"
                >
                  {r ? tr('সম্পাদনা', 'Edit') : tr('নম্বর দিন', 'Enter marks')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3"
          role="dialog"
          aria-modal="true"
        >
          <div className="card my-4 w-full max-w-lg space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy">{current.name}</h2>
                <p className="text-xs text-ink/60">
                  {tr('রোল', 'Roll')} {current.roll ?? '—'} · <span className="font-mono">{current.studentId}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-ink/50 hover:text-ink"
                aria-label={tr('বন্ধ করুন', 'Close')}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {exam.subjects.map((sub) => (
                <div key={sub.name} className="rounded border border-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-ink">
                      {sub.name}
                      <span className="ml-1 text-xs font-normal text-ink/60">
                        ({tr('পূর্ণমান', 'full')} {sub.fullMarks}
                        {sub.isOptional ? ' · ' + tr('ঐচ্ছিক', 'optional') : ''}
                        {isCoreSubject(sub.name) ? ' · ' + tr('পাস বাধ্যতামূলক', 'must pass') : ''})
                      </span>
                    </label>
                    <label className="flex items-center gap-1 text-xs text-ink/70">
                      <input
                        type="checkbox"
                        checked={!!absent[sub.name]}
                        onChange={(e) => setAbsent((a) => ({ ...a, [sub.name]: e.target.checked }))}
                      />
                      {tr('অনুপস্থিত', 'Absent')}
                    </label>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={sub.fullMarks}
                    step="0.01"
                    value={inputs[sub.name] ?? ''}
                    disabled={!!absent[sub.name]}
                    onChange={(e) => setInputs((m) => ({ ...m, [sub.name]: e.target.value }))}
                    className="input-field mt-2 w-full disabled:bg-surface"
                    placeholder={tr('প্রাপ্ত নম্বর', 'Marks obtained')}
                  />
                </div>
              ))}
            </div>

            {error && <p className="error-text">{error}</p>}
            {notice && <p className="text-sm text-green-700">{notice}</p>}

            <div className="flex flex-wrap justify-end gap-2 border-t border-surface pt-3">
              <button
                type="button"
                onClick={() => void save(false)}
                disabled={saveApi.isLoading}
                className="rounded border border-navy/30 px-4 py-2 text-sm text-navy disabled:opacity-50"
              >
                {tr('সংরক্ষণ', 'Save')}
              </button>
              <button
                type="button"
                onClick={() => void save(true)}
                disabled={saveApi.isLoading}
                className="btn-primary disabled:opacity-50"
              >
                {saveApi.isLoading ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ ও পরের জন', 'Save & next')}
              </button>
            </div>
          </div>
        </div>
      )}

      {sheet && (
        <PrintOverlay onClose={() => setSheet(null)}>
          <MarksheetSheet data={sheet} />
        </PrintOverlay>
      )}
    </div>
  );
    }
