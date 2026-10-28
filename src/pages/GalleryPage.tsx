// src/pages/GalleryPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useApi } from '@/hooks/useApi';
import SEOHead from '@/components/SEOHead';
import LoadingSpinner from '@/components/LoadingSpinner';
import ServerWaking from '@/components/ServerWaking';
import EmptyState from '@/components/EmptyState';
import type { GalleryItem } from '@/types';

export default function GalleryPage() {
  const { t, isBengali } = useLanguage();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: items, isLoading, isWaking, error, execute } =
    useApi<GalleryItem[]>('get', '/api/gallery/published');

  useEffect(() => {
    execute();
  }, [execute]);

  // Extract unique categories
  const categories = items
    ? ['all', ...Array.from(new Set(items.map((i) => i.category)))]
    : ['all'];

  const filtered =
    items && activeCategory !== 'all'
      ? items.filter((i) => i.category === activeCategory)
      : items || [];

  // Lightbox navigation
  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % filtered.length);
  }, [lightboxIndex, filtered.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + filtered.length) % filtered.length);
  }, [lightboxIndex, filtered.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, goNext, goPrev]);

  return (
    <>
      <SEOHead
        title={isBengali ? 'ফটো গ্যালারি' : 'Photo Gallery'}
        description={isBengali
          ? 'দ্য লিটল ফ্লাওয়ার স্কুলের ফটো গ্যালারি।'
          : 'Photo gallery of The Little Flower School.'}
        canonical="/gallery"
      />

      {/* Header */}
      <section className="bg-navy py-10 md:py-14">
        <div className="container-page text-center">
          <h1 className="text-2xl font-bold text-white md:text-3xl font-bengali">
            {t('gallery.title')}
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

        {!isLoading && !isWaking && !error && filtered.length === 0 && (
          <EmptyState title={t('gallery.empty')} />
        )}

        {!isLoading && !isWaking && !error && items && items.length > 0 && (
          <>
            {/* Category filter */}
            {categories.length > 2 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-navy text-white'
                        : 'bg-white text-ink-light border border-border hover:border-navy'
                    }`}
                  >
                    {cat === 'all' ? t('gallery.all') : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => openLightbox(index)}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-navy/5 focus:outline-none focus:ring-2 focus:ring-royal"
                >
                  <img
                    src={item.imagePath}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-navy/0 transition-colors group-hover:bg-navy/30">
                    <ZoomIn
                      size={24}
                      className="text-white opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy/70 to-transparent p-2">
                      <p className="text-xs text-white line-clamp-1">
                        {item.caption}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Lightbox */}
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label={t('common.close')}
            >
              <X size={24} />
            </button>

            {/* Prev */}
            {filtered.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                aria-label="Previous"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Image */}
            <img
              src={filtered[lightboxIndex].imagePath}
              alt={filtered[lightboxIndex].title}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Next */}
            {filtered.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                aria-label="Next"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Caption */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-sm text-white/80">
                {filtered[lightboxIndex].title}
              </p>
              {filtered[lightboxIndex].caption && (
                <p className="mt-1 text-xs text-white/50">
                  {filtered[lightboxIndex].caption}
                </p>
              )}
              <p className="mt-1 text-xs text-white/30">
                {lightboxIndex + 1} / {filtered.length}
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
      }
