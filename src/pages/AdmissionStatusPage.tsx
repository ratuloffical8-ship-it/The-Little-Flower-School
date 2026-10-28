// src/pages/AdmissionStatusPage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApi } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import ServerWaking from '@/components/ServerWaking';
import StatusBadge from '@/components/StatusBadge';
import { statusLookupSchema } from '@/utils/validation';
import { formatDate } from '@/utils/format';
import type { StatusLookupResponse } from '@/types/admission';

type FormData = {
  applicationId: string;
  guardianMobile: string;
};

export default function AdmissionStatusPage() {
  const { t, isBengali, locale } = useLanguage();
  const [hasSearched, setHasSearched] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(statusLookupSchema),
    defaultValues: { applicationId: '', guardianMobile: '' },
  });

  const { data, isLoading, isWaking, error, execute } =
    useApi<StatusLookupResponse>('post', '/api/admission/status');

  const onSubmit = async (formData: FormData) => {
    setHasSearched(true);
    await execute(formData);
  };

  const handleRetry = () => {
    if (data) return;
    handleSubmit(onSubmit)();
  };

  return (
    <>
      <SEOHead
        title={isBengali ? 'আবেদনের অবস্থা' : 'Application Status'}
        description={isBengali
          ? 'আপনার ভর্তি আবেদনের অবস্থা জানুন।'
          : 'Check your admission application status.'}
        canonical="/admission/status"
      />

      {/* Header */}
      <section className="bg-navy py-10 md:py-14">
        <div className="container-page text-center">
          <h1 className="text-2xl font-bold text-white md:text-3xl font-bengali">
            {t('admission.statusTitle')}
          </h1>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gold" />
          <p className="mt-3 text-sm text-white/70">
            {t('admission.statusSubtitle')}
          </p>
        </div>
      </section>

      {/* Form + Result */}
      <section className="container-page py-8 md:py-12">
        <div className="mx-auto max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
            {/* Application ID */}
            <div>
              <label className="label">
                {t('admission.applicationId')} <span className="text-error">*</span>
              </label>
              <input
                {...register('applicationId')}
                type="text"
                className="input-field"
                placeholder="TLFS-APP-2025-000001"
              />
              {errors.applicationId && (
                <p className="error-text">{errors.applicationId.message}</p>
              )}
            </div>

            {/* Guardian Mobile */}
            <div>
              <label className="label">
                {t('admission.guardianMobile')} <span className="text-error">*</span>
              </label>
              <input
                {...register('guardianMobile')}
                type="tel"
                className="input-field"
                placeholder="01XXXXXXXXX"
              />
              {errors.guardianMobile && (
                <p className="error-text">{errors.guardianMobile.message}</p>
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
              {t('admission.checkStatus')}
            </button>
          </form>

          {/* Server waking */}
          {isWaking && (
            <ServerWaking onRetry={handleRetry} />
          )}

          {/* Error */}
          {hasSearched && error && !isWaking && (
            <div className="mt-6 rounded-xl border border-error/20 bg-error/5 p-6 text-center">
              <p className="text-sm font-medium text-error">
                {t('admission.statusNotFound')}
              </p>
            </div>
          )}

          {/* Result */}
          {data && !error && (
            <div className="mt-6 card space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-light">
                  {t('admission.applicationId')}
                </span>
                <span className="text-sm font-semibold text-navy">
                  {data.applicationId}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-light">
                  {isBengali ? 'অবস্থা' : 'Status'}
                </span>
                <StatusBadge status={data.status} size="md" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-light">
                  {isBengali ? 'তারিখ' : 'Date'}
                </span>
                <span className="text-sm text-ink">
                  {formatDate(data.statusChangedAt, locale)}
                </span>
              </div>

              {data.correctionNote && (
                <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                  <p className="text-xs font-semibold text-warning">
                    {t('admission.correctionNote')}
                  </p>
                  <p className="mt-1 text-sm text-ink">{data.correctionNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
      }
