// src/pages/NoticesPage.tsx
import { useEffect } from 'react';
import { FileText, Download, Star } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApi } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import LoadingSpinner from '@/components/LoadingSpinner';
import ServerWaking from '@/components/ServerWaking';
import EmptyState from '@/components/EmptyState';
import { formatDate } from '@/utils/format';
import type { Notice } from '@/types';

export default function NoticesPage() {
  const { t, isBengali, locale } = useLanguage();

  const { data: notices, isLoading, isWaking, error, execute } =
    useApi<Notice[]>('get', '/api/notices/published');

  useEffect(() => {
    execute();
  }, [execute]);

  return (
    <>
      <SEOHead
        title={isBengali ? 'নোটিশ বোর্ড' : 'Notice Board'}
        description={isBengali
          ? 'দ্য লিটল ফ্লাওয়ার স্কুলের সর্বশেষ নোটিশ ও ঘোষণা।'
          : 'Latest notices and announcements from The Little Flower School.'}
        canonical="/notices"
      />

      {/* Header */}
      <section className="bg-navy py-10 md:py-14">
        <div className="container-page text-center">
          <h1 className="text-2xl font-bold text-white md:text-3xl font-bengali">
            {t('notices.title')}
          </h1>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-gold" />
        </div>
      </section>

      {/* Content */}
      <section className="container-page py-8 md:py-12">
        {isLoading && <LoadingSpinner />}

        {isWaking && <ServerWaking onRetry={execute} />}

        {error && !isWaking && (
          <div className="py-12 text-center">
            <p className="text-sm text-error">{error}</p>
            <button onClick={() => execute()} className="btn-outline mt-4 text-sm">
              {t('common.retry')}
            </button>
          </div>
        )}

        {!isLoading && !isWaking && !error && notices && notices.length === 0 && (
          <EmptyState
            icon={<FileText size={40} />}
            title={t('notices.empty')}
          />
        )}

        {!isLoading && !isWaking && !error && notices && notices.length > 0 && (
          <div className="mx-auto max-w-3xl space-y-4">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className={`card relative ${
                  notice.isImportant ? 'border-l-4 border-l-gold' : ''
                }`}
              >
                {notice.isImportant && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                    <Star size={10} />
                    {t('notices.important')}
                  </span>
                )}

                <h2 className="text-base font-bold text-navy md:text-lg font-bengali">
                  {isBengali ? notice.titleBn : notice.titleEn}
                </h2>

                <p className="mt-1 text-xs text-ink-light">
                  {t('notices.publishedOn')}:{' '}
                  {formatDate(notice.publicationDate, locale)}
                </p>

                {(isBengali ? notice.descriptionBn : notice.descriptionEn) && (
                  <p className="mt-3 text-sm leading-relaxed text-ink-light">
                    {isBengali ? notice.descriptionBn : notice.descriptionEn}
                  </p>
                )}

                {notice.pdfPath && (
                  <a
                    href="#"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-royal hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Download size={12} />
                    {t('notices.downloadPdf')}
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
                  }
