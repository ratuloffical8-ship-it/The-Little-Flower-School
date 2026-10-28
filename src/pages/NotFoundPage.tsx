// src/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import SEOHead from '@/components/SEOHead';

export default function NotFoundPage() {
  const { t, isBengali } = useLanguage();

  return (
    <>
      <SEOHead
        title={isBengali ? 'পৃষ্ঠা পাওয়া যায়নি' : 'Page Not Found'}
        noIndex
      />

      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 rounded-full bg-warning/10 p-5">
          <AlertTriangle size={48} className="text-warning" />
        </div>

        <h1 className="text-6xl font-extrabold text-navy">404</h1>

        <h2 className="mt-3 text-xl font-bold text-navy font-bengali">
          {t('notFound.title')}
        </h2>

        <p className="mt-2 max-w-md text-sm text-ink-light">
          {t('notFound.message')}
        </p>

        <Link to="/" className="btn-primary mt-8">
          <Home size={16} />
          {t('notFound.goHome')}
        </Link>
      </div>
    </>
  );
}
