// src/pages/ResultsPage.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApi } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import ServerWaking from '@/components/ServerWaking';
import { resultLookupSchema } from '@/utils/validation';
import { formatGPA, formatPercentage } from '@/utils/format';
import type { Result, Exam } from '@/types';

type FormData = {
  studentId: string;
  examId: string;
  dateOfBirth: string;
};

export default function ResultsPage() {
  const { t, isBengali, locale } = useLanguage();
  const [hasSearched, setHasSearched] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(resultLookupSchema),
    defaultValues: { studentId: '', examId: '', dateOfBirth: '' },
  });

  // Fetch published exams for dropdown
  const {
    data: exams,
    execute: fetchExams,
    isLoading: examsLoading,
  } = useApi<Exam[]>('get', '/api/results/exams/published');

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Lookup result
  const { data: result, isLoading, isWaking, error, execute } =
    useApi<Result>('post', '/api/results/lookup');

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
        description={isBengali
          ? 'আপনার পরীক্ষার ফলাফল দেখুন — স্টুডেন্ট আইডি ও জন্মতারিখ দিন।'
          : 'Check your exam results — enter Student ID and date of birth.'}
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
            {t('results.subtitle')}
          </p>
        </div>
      </section>

      {/* Form + Result */}
      <section className="container-page py-8 md:py-12">
        <div className="mx-auto max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
            {/* Student ID */}
            <div>
              <label className="label">
                {t('results.studentId')} <span className="text-error">*</span>
              </label>
              <input
                {...register('studentId')}
                type="text"
                className="input-field"
                placeholder="TLFS-STU-2025-0001"
              />
              {errors.studentId && (
                <p className="error-text">{errors.studentId.message}</p>
              )}
            </div>

            {/* Exam Dropdown */}
            <div>
              <label className="label">
                {t('results.exam')} <span className="text-error">*</span>
              </label>
              <select
                {...register('examId')}
                className="input-field"
                disabled={examsLoading}
              >
                <option value="">{t('results.selectExam')}</option>
                {exams?.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {isBengali ? exam.nameBn : exam.name}
                  </option>
                ))}
              </select>
              {errors.examId && (
                <p className="error-text">{errors.examId.message}</p>
              )}
              {!examsLoading && exams && exams.length === 0 && (
                <p className="mt-1 text-xs text-ink-light">
                  {t('results.noPublished')}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="label">
                {t('results.dob')} <span className="text-error">*</span>
              </label>
              <input
                {...register('dateOfBirth')}
                type="date"
                className="input-field"
              />
              {errors.dateOfBirth && (
                <p className="error-text">{errors.dateOfBirth.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              {t('results.lookup')}
            </button>
          </form>

          {/* Server waking */}
          {isWaking && <ServerWaking onRetry={handleRetry} />}

          {/* Error */}
          {hasSearched && error && !isWaking && (
            <div className="mt-6 rounded-xl border border-error/20 bg-error/5 p-6 text-center">
              <p className="text-sm font-medium text-error">
                {t('results.notFound')}
              </p>
            </div>
          )}

          {/* Marksheet */}
          {result && !error && (
            <div className="mt-6 card">
              <h2 className="mb-4 text-lg font-bold text-navy font-bengali">
                {t('results.marksheet')}
              </h2>

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
                    {result.marks.map((m) => (
                      <tr key={m.subjectId}>
                        <td className="px-3 py-2 font-medium text-ink">
                          {m.subjectName}
                        </td>
                        <td className="px-3 py-2 text-center text-ink-light">
                          {m.fullMarks}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-navy">
                          {m.obtained}
                        </td>
                        <td className="px-3 py-2 text-center">{m.grade}</td>
                        <td className="px-3 py-2 text-center">
                          {formatGPA(m.gpa, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-navy bg-surface font-semibold">
                      <td className="px-3 py-2 text-navy">{t('results.total')}</td>
                      <td className="px-3 py-2 text-center text-ink">
                        {result.totalFull}
                      </td>
                      <td className="px-3 py-2 text-center text-navy">
                        {result.totalObtained}
                      </td>
                      <td className="px-3 py-2 text-center text-navy">
                        {result.grade}
                      </td>
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
                <span
                  className={`font-bold ${
                    result.isPassed ? 'text-success' : 'text-error'
                  }`}
                >
                  {result.isPassed ? t('results.pass') : t('results.fail')}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
  }
