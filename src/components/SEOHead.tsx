// src/components/SEOHead.tsx
import { useEffect } from 'react';
import { env } from '@/lib/env';

interface SEOHeadProps {
  /** Page title (will be appended to school name) */
  title: string;
  /** Meta description */
  description?: string;
  /** Open Graph image URL (relative to site root) */
  ogImage?: string;
  /** Set to true to add noindex (e.g., admin pages) */
  noIndex?: boolean;
  /** Canonical path (e.g., "/admission") */
  canonical?: string;
}

/**
 * Manages document <head> meta tags for SEO.
 * Uses direct DOM manipulation (no external dependency needed).
 */
export default function SEOHead({
  title,
  description,
  ogImage,
  noIndex = false,
  canonical,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = `${title} — দ্য লিটল ফ্লাওয়ার স্কুল`;

    // Title
    document.title = fullTitle;

    // Description
    setMeta('name', 'description', description || 'দ্য লিটল ফ্লাওয়ার স্কুল — স্থাপিত ২০১৬। শিক্ষায় উৎকর্ষ, নৈতিকতায় বিকাশ।');

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description || 'শিক্ষায় উৎকর্ষ, নৈতিকতায় বিকাশ');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', canonical ? `${env.VITE_SITE_URL}${canonical}` : env.VITE_SITE_URL);
    setMeta('property', 'og:image', ogImage ? `${env.VITE_SITE_URL}${ogImage}` : `${env.VITE_SITE_URL}/images/logo.png`);

    // Robots
    if (noIndex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      setMeta('name', 'robots', 'index, follow');
    }

    // Canonical
    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = `${env.VITE_SITE_URL}${canonical}`;
    } else if (canonicalLink) {
      canonicalLink.remove();
    }

    return () => {
      // Cleanup: reset title on unmount
      document.title = 'দ্য লিটল ফ্লাওয়ার স্কুল';
    };
  }, [title, description, ogImage, noIndex, canonical]);

  // This component renders nothing visible
  return null;
}

/* ── Helper ── */

function setMeta(attr: 'name' | 'property', value: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.content = content;
}
