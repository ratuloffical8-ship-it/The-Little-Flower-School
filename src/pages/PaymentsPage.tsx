// src/pages/PaymentsPage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApi } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import ServerWaking from '@/components/ServerWaking';
import FileUpload from '@/components/FileUpload';
import { paymentSubmissionSchema } from '@/utils/validation';
import { MAX_SCREENSHOT_SIZE, ALLOWED_IMAGE_TYPES } from '@/utils/validation';
import type { PaymentSubmissionRequest } from '@/types/payment';

type FormData = PaymentSubmissionRequest & {
  screenshot: File[];
};

export default function PaymentsPage() {
  const { t, isBengali } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(paymentSubmissionSchema),
    defaultValues: {
      studentIdOrApplicationId: '',
      guardianMobile: '',
      payerMobile: '',
      provider: 'bkash',
      transactionId: '',
      amount: 0,
      purpose: '',
    },
  });

  const { isWaking, error, execute } =
    useApi('post', '/api/payments/submit');

  const onSubmit = async (data: FormData) => {
    const { screenshot, ...payload } = data;
    await execute(payload);
    setSubmitted(true);
    reset();
    setScreenshotFiles([]);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  if (submitted) {
    return (
      <>
        <SEOHead title={isBengali ? 'পেমেন্ট' : 'Payments'} canonical="/payments" />
        <section className="bg-navy py-10 md:py-14">
          <div className="container-page text-center">
            <h1 className="text-2xl font-bold text-white md:text-3xl font-bengali">
              {t('payments.title')}
            </h1>
            <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gold" />
          </div>
        </section>
        <section className="container-page py-12">
          <div className="mx-auto max-w-md text-center">
            <CheckCircle size={56} className="mx-auto text-success" />
            <h2 className="mt-4 text-xl font-bold text-navy font-bengali">
              {t('payments.successTitle')}
            </h2>
            <p className="mt-2 text-sm text-ink-light">
              {t('payments.successMessage')}
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="btn-outline mt-6"
            >
              {isBengali ? 'আরেকটি পেমেন্ট' : 'Another Payment'}
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={isBengali ? 'ফি পেমেন্ট' : 'Fee Payment'}
        description={isBengali
          ? 'bKash বা Nagad এর মাধ্যমে স্কুল ফি পরিশোধ করুন।'
          : 'Pay school fees via bKash or Nagad.'}
        canonical="/payments"
      />

      {/* Header */}
      <section className="bg-navy py-10 md:py-14">
        <div className="container-page text-center">
          <h1 className="text-2xl font-bold text-white md:text-3xl font-bengali">
            {t('payments.title')}
          </h1>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gold" />
          <p className="mt-3 text-sm text-white/70">
            {t('payments.subtitle')}
          </p>
        </div>
      </section>

      <section className="container-page py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Payment Instructions */}
          <div className="mb-8 card bg-navy/5">
            <h2 className="mb-4 text-base font-bold text-navy font-bengali">
              {t('payments.instructions')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* bKash */}
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-semibold text-navy">bKash</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-surface px-3 py-2 text-sm font-mono text-ink">
                    {t('common.editableSample')}
                  </code>
                  <button
                    onClick={() => copyToClipboard('01XXXXXXXXX', 'bkash')}
                    className="rounded p-1.5 text-ink-light hover:bg-surface"
                    title={t('common.copy')}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                {copiedField === 'bkash' && (
                  <p className="mt-1 text-xs text-success">{t('common.copied')}</p>
                )}
              </div>

              {/* Nagad */}
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-semibold text-navy">Nagad</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-surface px-3 py-2 text-sm font-mono text-ink">
                    {t('common.editableSample')}
                  </code>
                  <button
                    onClick={() => copyToClipboard('01XXXXXXXXX', 'nagad')}
                    className="rounded p-1.5 text-ink-light hover:bg-surface"
                    title={t('common.copy')}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                {copiedField === 'nagad' && (
                  <p className="mt-1 text-xs text-success">{t('common.copied')}</p>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-xs leading-relaxed text-ink-light">
                {t('payments.warning')}
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
            <h2 className="text-base font-bold text-navy font-bengali">
              {isBengali ? 'পেমেন্ট তথ্য দিন' : 'Enter Payment Details'}
            </h2>

            {/* Student ID / Application ID */}
            <div>
              <label className="label">
                {t('payments.studentId')} <span className="text-error">*</span>
              </label>
              <input
                {...register('studentIdOrApplicationId')}
                type="text"
                className="input-field"
                placeholder="TLFS-STU-2025-0001"
              />
              {errors.studentIdOrApplicationId && (
                <p className="error-text">{errors.studentIdOrApplicationId.message}</p>
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

            {/* Payer Mobile */}
            <div>
              <label className="label">
                {t('payments.payerMobile')} <span className="text-error">*</span>
              </label>
              <input
                {...register('payerMobile')}
                type="tel"
                className="input-field"
                placeholder="01XXXXXXXXX"
              />
              {errors.payerMobile && (
                <p className="error-text">{errors.payerMobile.message}</p>
              )}
            </div>

            {/* Provider */}
            <div>
              <label className="label">
                {t('payments.provider')} <span className="text-error">*</span>
              </label>
              <select {...register('provider')} className="input-field">
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="cash">{isBengali ? 'নগদ' : 'Cash'}</option>
                <option value="bank">{isBengali ? 'ব্যাংক' : 'Bank'}</option>
              </select>
            </div>

            {/* Transaction ID */}
            <div>
              <label className="label">
                {t('payments.transactionId')} <span className="text-error">*</span>
              </label>
              <input
                {...register('transactionId')}
                type="text"
                className="input-field"
                placeholder="ABC123XYZ"
              />
              {errors.transactionId && (
                <p className="error-text">{errors.transactionId.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="label">
                {t('payments.amount')} <span className="text-error">*</span>
              </label>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                className="input-field"
                placeholder="1000"
                min="1"
              />
              {errors.amount && (
                <p className="error-text">{errors.amount.message}</p>
              )}
            </div>

            {/* Purpose */}
            <div>
              <label className="label">
                {t('payments.purpose')} <span className="text-error">*</span>
              </label>
              <input
                {...register('purpose')}
                type="text"
                className="input-field"
                placeholder={isBengali ? 'মাসিক টিউশন ফি — জানুয়ারি ২০২৫' : 'Monthly tuition — January 2025'}
              />
              {errors.purpose && (
                <p className="error-text">{errors.purpose.message}</p>
              )}
            </div>

            {/* Screenshot */}
            <FileUpload
              files={screenshotFiles}
              onChange={setScreenshotFiles}
              maxFiles={1}
              maxSize={MAX_SCREENSHOT_SIZE}
              acceptedTypes={ALLOWED_IMAGE_TYPES}
              accept="image/*"
              label={t('payments.screenshot')}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('payments.submitting')}
                </>
              ) : (
                t('payments.submit')
              )}
            </button>

            {/* Error */}
            {error && !isWaking && (
              <p className="text-center text-sm text-error">{error}</p>
            )}
          </form>

          {isWaking && <ServerWaking onRetry={() => handleSubmit(onSubmit)()} />}
        </div>
      </section>
    </>
  );
      }
