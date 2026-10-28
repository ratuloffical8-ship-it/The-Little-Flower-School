// src/pages/ContactPage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApi } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import ServerWaking from '@/components/ServerWaking';
import { contactFormSchema } from '@/utils/validation';

type FormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  honeypot?: string;
};

export default function ContactPage() {
  const { t, isBengali } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      honeypot: '',
    },
  });

  const { isWaking, error, execute } = useApi('post', '/api/contact');

  const onSubmit = async (data: FormData) => {
    await execute(data);
    setSubmitted(true);
    reset();
  };

  return (
    <>
      <SEOHead
        title={isBengali ? 'যোগাযোগ' : 'Contact'}
        description={isBengali
          ? 'দ্য লিটল ফ্লাওয়ার স্কুলের সাথে যোগাযোগ করুন।'
          : 'Get in touch with The Little Flower School.'}
        canonical="/contact"
      />

      {/* Header */}
      <section className="bg-navy py-10 md:py-14">
        <div className="container-page text-center">
          <h1 className="text-2xl font-bold text-white md:text-3xl font-bengali">
            {t('contact.title')}
          </h1>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gold" />
          <p className="mt-3 text-sm text-white/70">
            {t('contact.subtitle')}
          </p>
        </div>
      </section>

      <section className="container-page py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Contact Info */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-royal/10 p-2.5 text-royal">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-navy">
                    {t('contact.address')}
                  </h3>
                  <p className="mt-1 text-sm text-ink-light">
                    {t('common.editableSample')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-royal/10 p-2.5 text-royal">
                  <Phone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-navy">
                    {t('contact.phoneLabel')}
                  </h3>
                  <p className="mt-1 text-sm text-ink-light">
                    {t('common.editableSample')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-royal/10 p-2.5 text-royal">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-navy">
                    {t('contact.emailLabel')}
                  </h3>
                  <p className="mt-1 text-sm text-ink-light">
                    {t('common.editableSample')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-royal/10 p-2.5 text-royal">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-navy">
                    {t('contact.hours')}
                  </h3>
                  <p className="mt-1 text-sm text-ink-light">
                    {t('common.editableSample')}
                  </p>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="mt-8 aspect-video overflow-hidden rounded-xl bg-navy/5">
              <div className="flex h-full items-center justify-center">
                <MapPin size={32} className="text-navy/15" />
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="card py-12 text-center">
                <CheckCircle size={48} className="mx-auto text-success" />
                <h2 className="mt-4 text-lg font-bold text-navy font-bengali">
                  {t('contact.success')}
                </h2>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-outline mt-6 text-sm"
                >
                  {isBengali ? 'আরেকটি বার্তা পাঠান' : 'Send Another Message'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Name */}
                  <div>
                    <label className="label">
                      {t('contact.name')} <span className="text-error">*</span>
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      className="input-field"
                    />
                    {errors.name && (
                      <p className="error-text">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="label">
                      {t('contact.email')} <span className="text-error">*</span>
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="input-field"
                    />
                    {errors.email && (
                      <p className="error-text">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Phone */}
                  <div>
                    <label className="label">
                      {t('contact.phone')} <span className="text-error">*</span>
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      className="input-field"
                      placeholder="01XXXXXXXXX"
                    />
                    {errors.phone && (
                      <p className="error-text">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="label">
                      {t('contact.subject')} <span className="text-error">*</span>
                    </label>
                    <input
                      {...register('subject')}
                      type="text"
                      className="input-field"
                    />
                    {errors.subject && (
                      <p className="error-text">{errors.subject.message}</p>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="label">
                    {t('contact.message')} <span className="text-error">*</span>
                  </label>
                  <textarea
                    {...register('message')}
                    rows={5}
                    className="input-field resize-none"
                  />
                  {errors.message && (
                    <p className="error-text">{errors.message.message}</p>
                  )}
                </div>

                {/* Honeypot — hidden from real users, bots fill it */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <input
                    {...register('honeypot')}
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('contact.sending')}
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {t('contact.send')}
                    </>
                  )}
                </button>

                {/* Error */}
                {error && !isWaking && (
                  <p className="text-sm text-error">{error}</p>
                )}
              </form>
            )}

            {isWaking && <ServerWaking onRetry={() => handleSubmit(onSubmit)()} />}
          </div>
        </div>
      </section>
    </>
  );
          }
