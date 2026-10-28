// src/pages/FAQPage.tsx
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApiGet } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import LoadingSpinner from '@/components/LoadingSpinner';
import ServerWaking from '@/components/ServerWaking';
import EmptyState from '@/components/EmptyState';
import type { FAQ } from '@/types';

export default function FAQPage() {
  const { t, isBengali, locale } = useLanguage();
  const { data, isLoading, isWaking, error } = useApiGet<FAQ[]>('/api/faq/published', []);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (isWaking) return <ServerWaking />;
  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-error">{isBengali ? 'FAQ লোড করতে সমস্যা হয়েছে।' : 'Failed to load FAQs.'}</p>
      </div>
    );
  }

  const faqs = data ?? [];

  return (
    <>
      <SEOHead
        title={t('faq.title')}
        description={isBengali ? 'সচরাচর জিজ্ঞাসা — দ্য লিটল ফ্লাওয়ার স্কুল' : 'Frequently Asked Questions — The Little Flower School'}
        canonical="/faq"
      />
      <div className="container-page py-10">
        <h1 className="section-title text-center mb-8">{t('faq.title')}</h1>

        {faqs.length === 0 ? (
          <EmptyState
            title={isBengali ? 'কোনো FAQ নেই' : 'No FAQs available'}
            message={isBengali ? 'শীঘ্রই প্রশ্নোত্তর যোগ করা হবে।' : 'FAQs will be added soon.'}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq) => {
              const isOpen = openId === faq.id;
              const question = locale === 'bn' ? faq.questionBn : faq.questionEn;
              const answer = locale === 'bn' ? faq.answerBn : faq.answerEn;

              return (
                <div key={faq.id} className="card overflow-hidden">
                  <button
                    onClick={() => toggle(faq.id)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left focus:outline-none focus:ring-2 focus:ring-royal focus:ring-inset"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${faq.id}`}
                  >
                    <span className="font-medium text-navy pr-4">{question}</span>
                    <svg
                      className={`w-5 h-5 text-ink-light flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div
                      id={`faq-answer-${faq.id}`}
                      role="region"
                      className="px-4 md:px-5 pb-4 md:pb-5 text-ink text-sm leading-relaxed border-t border-border pt-3"
                    >
                      {answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
    }
