// src/pages/ResultsPage.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApi } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import ServerWaking from '@/components/ServerWaking';
import { formatGPA, formatPercentage } from '@/utils/format';

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
}

interface PublicResult {
  exam: { id: string; name: string };
  student: { studentId: string; name: string; classId: string; roll?: string | number };
  subjects: SubjectRow[];
  total: number;
  fullTotal: number;
  percentage: number;
  gpa: number;
  grade: string;
  passed: boolean;
}

/* ── Form: exam + roll + guardian mobile ── */

const lookupSchema = z.object({
  examId: z.string().min(1, 'পরীক্ষা নির্বাচন করুন / Select an exam'),
  roll: z.string().trim().regex(/^\d{1,4}$/, 'সঠিক রোল নম্বর দিন / Enter a valid roll number'),
  mobile: z
    .string()
    .trim()
    .regex(/^(?:\+?88)?01[3-9]\d{8}$/, 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX) / Enter a valid mobile number'),
});

type FormData = z.infer<typeof lookupSchema>;

export default function ResultsPage() {
  const { t, isBengali, locale } = useLanguage();
  const [hasSearched, setHasSearched] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { examId: '', roll: '', mobile: '' },
  });

  // Published exams for the dropdown (API returns { items: [...] })
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

  const { data: result, isLoading, isWaking, error, execute } =
    useApi<PublicResult>('post', '/api/results/lookup');

  const onSubmit = async (formData: FormData) => {
    setHasSearched(true);
    await execute(formData);
  };

  const handleRetry = () => {
    handleSubmit(onSubmit)();
  };

  return (
    <>
      <SEOHead
        title={isBengali ? 'ফলাফল' : 'Results'}
        description={
          isBengali
            ? 'আপনার পরীক্ষার ফলাফল দেখুন — রোল নম্বর ও অভিভাবকের মোবাইল নম্বর দিন।'
            : 'Check your exam results — enter roll number and guardian mobile number.'
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
              ? 'পরীক্ষা নির্বাচন করে রোল নম্বর ও অভিভাবকের মোবাইল নম্বর দিন'
              : 'Select the exam, then enter roll number and guardian mobile number'}
          </p>
        </div>
      </section>

      {/* Form + Result */}
      <section className="container-page py-8 md:py-12">
        <div className="mx-auto max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
            {/* Exam */}
            <div>
              <label className="label">
                {t('results.exam')} <span className="text-error">*</span>
              </label>
              <select {...register('examId')} className="input-field" disabled={examsLoading}>
                <option value="">{t('results.selectExam')}</option>
                {exams?.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
              {errors.examId && <p className="error-text">{errors.examId.message}</p>}
              {!examsLoading && exams && exams.length === 0 && (
                <p className="mt-1 text-xs text-ink-light">{t('results.noPublished')}</p>
              )}
            </div>

            {/* Roll */}
            <div>
              <label className="label">
                {isBengali ? 'রোল নম্বর' : 'Roll Number'} <span className="text-error">*</span>
              </label>
              <input
                {...register('roll')}
                type="text"
                inputMode="numeric"
                className="input-field"
                placeholder="1"
              />
              {errors.roll && <p className="error-text">{errors.roll.message}</p>}
            </div>

            {/* Mobile */}
            <div>
              <label className="label">
                {isBengali ? 'অভিভাবকের মোবাইল নম্বর' : 'Guardian Mobile Number'}{' '}
                <span className="text-error">*</span>
              </label>
              <input
                {...register('mobile')}
                type="tel"
                className="input-field"
                placeholder="01XXXXXXXXX"
              />
              {errors.mobile && <p className="error-text">{errors.mobile.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {t('results.lookup')}
            </button>
          </form>

          {isWaking && <ServerWaking onRetry={handleRetry} />}

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
    </>
  );
    }
