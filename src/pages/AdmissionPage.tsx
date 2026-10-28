// src/pages/AdmissionPage.tsx
import { useLanguage } from '@/hooks/useLanguage';
import SEOHead from '@/components/SEOHead';
import AdmissionForm from '@/features/admission/AdmissionForm';

export default function AdmissionPage() {
  const { t, isBengali } = useLanguage();

  return (
    <>
      <SEOHead
        title={isBengali ? 'ভর্তি আবেদন' : 'Admission Application'}
        description={isBengali
          ? 'দ্য লিটল ফ্লাওয়ার স্কুলে অনলাইন ভর্তি আবেদন করুন। প্লে থেকে দশম শ্রেণি।'
          : 'Apply for admission online at The Little Flower School. Play to Class 10.'}
        canonical="/admission"
      />

      {/* Page Header */}
      <section className="bg-navy py-10 md:py-14">
        <div className="container-page text-center">
          <h1 className="text-2xl font-bold text-white md:text-3xl font-bengali">
            {t('admission.title')}
          </h1>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gold" />
          <p className="mt-3 text-sm text-white/70">
            {t('admission.subtitle')}
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="container-page py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <AdmissionForm />
        </div>
      </section>
    </>
  );
      }
