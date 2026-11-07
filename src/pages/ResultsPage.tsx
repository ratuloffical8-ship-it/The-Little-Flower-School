// src/pages/ResultsPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Printer } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApi } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import ServerWaking from '@/components/ServerWaking';
import PrintOverlay from '@/components/PrintOverlay';
import MarksheetSheet from '@/components/MarksheetSheet';
import { formatGPA, formatPercentage } from '@/utils/format';
import { CLASS_ORDER, classLabel } from '@/utils/classes';

/* ── Types (match GET /api/results/exams/published and POST /api/results/lookup) ── */

interface PublishedExam {
  id: string;
  name: string;
  classId?: string;
}

interface SubjectRow {
  name: string;
  fullMarks: number;
  marks: number | null;
  grade: string;
  gradePoint: number;
  passed: boolean;
  isOptional?: boolean;
}

interface PublicResult {
  exam: { id: string; name: string };
  student: {
    studentId: string;
    name: string;
    nameBn?: string;
    nameEn?: string;
    classId: string;
    sessionId?: string;
    roll?: string | number;
    fatherName?: string;
    motherName?: string;
    address?: string;
    dateOfBirth?: string;
    photo?: string;
  };
  subjects: SubjectRow[];
  total: number;
  fullTotal: number;
  percentage: number;
  gpa: number;
  grade: string;
  passed: boolean;
}

const MOBILE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;

export default function ResultsPage() {
  const { t, isBengali, locale } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  // Form state: class → exam → (roll | student id) + guardian mobile
  const [classId, setClassId] = useState('');
  const [examId, setExamId] = useState('');
  const [by, setBy] = useState<'roll' | 'studentId'>('roll');
  const [roll, setRoll] = useState('');
  const [studentId, setStudentId] = useState('');
  const [mobile, setMobile] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Published exams for the dropdowns (API returns { items: [...] })
  const {
    data: examsRaw,
    execute: fetchExams,
    isLoading: examsLoading,
  } = useApi<PublishedExam[] | { items: PublishedExam[] }>('get', '/api/results/exams/published');

  const exams: PublishedExam[] | null = examsRaw
    ? Array.isArray(examsRaw)
      ? examsRaw
      : examsRaw.items ?? []
    : null;

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const classOptions = useMemo(() => {
    const ids = new Set((exams ?? []).map((e) => e.classId).filter((x): x is string => !!x));
    return [...ids].sort((a, b) => {
      const ia = CLASS_ORDER.indexOf(a);
      const ib = CLASS_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [exams]);

  const examsOfClass = useMemo(
    () => (exams ?? []).filter((e) => !classId || e.classId === classId),
    [exams, classId],
  );

  const { data: result, isLoading, isWaking, error, execute } =
    useApi<PublicResult>('post', '/api/results/lookup');

  const submit = async () => {
    setFormError(null);
    if (!classId) return setFormError(tr('শ্রেণি নির্বাচন করুন।', 'Select a class.'));
    if (!examId) return setFormError(tr('পরীক্ষা নির্বাচন করুন।', 'Select an exam.'));
    if (by === 'roll' && !/^\d{1,4}$/.test(roll.trim()))
      return setFormError(tr('সঠিক রোল নম্বর দিন।', 'Enter a valid roll number.'));
    if (by === 'studentId' && studentId.trim().length < 5)
      return setFormError(tr('শিক্ষার্থী আইডি দিন।', 'Enter the student ID.'));
    if (!MOBILE_RE.test(mobile.trim()))
      return setFormError(tr('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।', 'Enter a valid mobile number.'));

    setHasSearched(true);
    await execute({
      examId,
      mobile: mobile.trim(),
      ...(by === 'roll' ? { roll: roll.trim() } : { studentId: studentId.trim().toUpperCase() }),
    });
  };

  return (
    <>
      <SEOHead
        title={isBengali ? 'ফলাফল' : 'Results'}
        description={
          isBengali
            ? 'আপনার পরীক্ষার ফলাফল দেখুন — শ্রেণি, পরীক্ষা, রোল বা শিক্ষার্থী আইডি ও অভিভাবকের মোবাইল নম্বর দিন।'
            : 'Check your exam results — class, exam, roll or student ID and guardian mobile number.'
        }
        canonical="/results"
      />

      {/* Header */}
      <section className="bg-navy py-10 md:py-14">
        <div className="container-page text-center">
          <h1 className="text-2xl font-bold text-white md:text-3xl font-bengali">
            {t('results.title')}
          </h1>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gold" />
          <p className="mt-3 text-sm text-white/70">
            {isBengali
              ? 'শ্রেণি ও পরীক্ষা নির্বাচন করে রোল বা শিক্ষার্থী আইডি এবং অভিভাবকের মোবাইল নম্বর দিন'
              : 'Select class and exam, then enter roll or student ID and guardian mobile number'}
          </p>
        </div>
      </section>

      {/* Form + Result */}
      <section className="container-page py-8 md:py-12">
        <div className="mx-auto max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="card space-y-5"
          >
            {/* Class */}
            <div>
              <label className="label">
                {tr('শ্রেণি', 'Class')} <span className="text-error">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setExamId('');
                }}
                className="input-field"
                disabled={examsLoading}
              >
                <option value="">{tr('শ্রেণি নির্বাচন করুন', 'Select class')}</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {classLabel(c, isBengali)}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam */}
            <div>
              <label className="label">
                {t('results.exam')} <span className="text-error">*</span>
              </label>
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className="input-field"
                disabled={examsLoading || !classId}
              >
                <option value="">{t('results.selectExam')}</option>
                {examsOfClass.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
              {!examsLoading && exams && exams.length === 0 && (
                <p className="mt-1 text-xs text-ink-light">{t('results.noPublished')}</p>
              )}
            </div>

            {/* Roll or Student ID */}
            <div>
              <div className="mb-2 flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setBy('roll')}
                  className={`rounded-full border px-3 py-1 ${by === 'roll' ? 'border-navy bg-navy text-white' : 'border-border'}`}
                >
                  {tr('রোল নম্বর', 'Roll number')}
                </button>
                <button
                  type="button"
                  onClick={() => setBy('studentId')}
                  className={`rounded-full border px-3 py-1 ${by === 'studentId' ? 'border-navy bg-navy text-white' : 'border-border'}`}
                >
                  {tr('শিক্ষার্থী আইডি', 'Student ID')}
                </button>
              </div>
              {by === 'roll' ? (
                <input
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  type="text"
                  inputMode="numeric"
                  className="input-field"
                  placeholder="1"
                />
              ) : (
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  type="text"
                  className="input-field"
                  placeholder="TLFS-STU-2026-0001"
                />
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="label">
                {isBengali ? 'অভিভাবকের মোবাইল নম্বর' : 'Guardian Mobile Number'}{' '}
                <span className="text-error">*</span>
              </label>
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                type="tel"
                className="input-field"
                placeholder="01XXXXXXXXX"
              />
            </div>

            {formError && <p className="error-text">{formError}</p>}

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {t('results.lookup')}
            </button>
          </form>

          {isWaking && <ServerWaking onRetry={() => void submit()} />}

          {hasSearched && error && !isWaking && (
            <div className="mt-6 rounded-xl border border-error/20 bg-error/5 p-6 text-center">
              <p className="text-sm font-medium text-error">{t('results.notFound')}</p>
            </div>
          )}

          {/* Marksheet */}
          {result && !error && Array.isArray(result.subjects) && (
            <div className="mt-6 card">
              <h2 className="mb-1 text-lg font-bold text-navy font-bengali">
                {t('results.marksheet')}
              </h2>
              <p className="mb-4 text-sm text-ink-light">
                {result.exam?.name} — {result.student?.name}
                {result.student?.roll !== undefined && result.student?.roll !== null
                  ? ` (${isBengali ? 'রোল' : 'Roll'} ${result.student.roll})`
                  : ''}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-ink-light">
                        {t('results.subject')}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-ink-light">
                        {t('results.fullMarks')}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-ink-light">
                        {t('results.obtained')}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-ink-light">
                        {t('results.grade')}
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-ink-light">
                        {t('results.gpa')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.subjects.map((m) => (
                      <tr key={m.name}>
                        <td className="px-3 py-2 font-medium text-ink">{m.name}</td>
                        <td className="px-3 py-2 text-center text-ink-light">{m.fullMarks}</td>
                        <td className="px-3 py-2 text-center font-semibold text-navy">
                          {m.marks === null ? (isBengali ? 'অনুপস্থিত' : 'Absent') : m.marks}
                        </td>
                        <td className="px-3 py-2 text-center">{m.grade}</td>
                        <td className="px-3 py-2 text-center">{formatGPA(m.gradePoint, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-navy bg-surface font-semibold">
                      <td className="px-3 py-2 text-navy">{t('results.total')}</td>
                      <td className="px-3 py-2 text-center text-ink">{result.fullTotal}</td>
                      <td className="px-3 py-2 text-center text-navy">{result.total}</td>
                      <td className="px-3 py-2 text-center text-navy">{result.grade}</td>
                      <td className="px-3 py-2 text-center text-navy">
                        {formatGPA(result.gpa, locale)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-ink-light">{t('results.percentage')}</span>
                <span className="font-semibold text-navy">
                  {formatPercentage(result.percentage, locale)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowSheet(true)}
                className="btn-primary mt-4 w-full"
              >
                <Printer size={16} />
                {tr('মার্কশিট ডাউনলোড / প্রিন্ট (PDF)', 'Download / print marksheet (PDF)')}
              </button>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink-light">{t('results.result')}</span>
                <span className={`font-bold ${result.passed ? 'text-success' : 'text-error'}`}>
                  {result.passed ? t('results.pass') : t('results.fail')}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {showSheet && result && Array.isArray(result.subjects) && (
        <PrintOverlay onClose={() => setShowSheet(false)}>
          <MarksheetSheet
            data={{
              examName: result.exam.name,
              student: {
                studentId: result.student.studentId,
                nameBn: result.student.nameBn || result.student.name,
                nameEn: result.student.nameEn,
                classId: result.student.classId,
                sessionId: result.student.sessionId,
                roll: result.student.roll,
                fatherName: result.student.fatherName,
                motherName: result.student.motherName,
                address: result.student.address,
                dateOfBirth: result.student.dateOfBirth,
                photo: result.student.photo,
              },
              subjects: result.subjects,
              total: result.total,
              fullTotal: result.fullTotal,
              percentage: result.percentage,
              gpa: result.gpa,
              grade: result.grade,
              passed: result.passed,
            }}
          />
        </PrintOverlay>
      )}
    </>
  );
  }
