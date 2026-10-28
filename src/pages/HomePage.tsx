// src/pages/HomePage.tsx
import { Link } from 'react-router-dom';
import {
  FileText,
  Award,
  CreditCard,
  Bell,
  BookOpen,
  Users,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  GraduationCap,
  Star,
  Image as ImageIcon,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import SEOHead from '@/components/SEOHead';

/* ── Quick Action Cards ── */

const QUICK_ACTIONS = [
  { path: '/admission', iconBn: 'ভর্তি', iconEn: 'Admission', icon: <FileText size={24} />, color: 'bg-royal' },
  { path: '/results', iconBn: 'ফলাফল', iconEn: 'Results', icon: <Award size={24} />, color: 'bg-success' },
  { path: '/payments', iconBn: 'পেমেন্ট', iconEn: 'Payments', icon: <CreditCard size={24} />, color: 'bg-gold' },
  { path: '/notices', iconBn: 'নোটিশ', iconEn: 'Notices', icon: <Bell size={24} />, color: 'bg-warning' },
];

/* ── Facilities ── */

const FACILITIES = [
  { iconBn: 'আধুনিক শ্রেণিকক্ষ', iconEn: 'Modern Classrooms', icon: <BookOpen size={20} /> },
  { iconBn: 'কম্পিউটার ল্যাব', iconEn: 'Computer Lab', icon: <GraduationCap size={20} /> },
  { iconBn: 'গ্রন্থাগার', iconEn: 'Library', icon: <Star size={20} /> },
  { iconBn: 'খেলাধুলার মাঠ', iconEn: 'Playground', icon: <Users size={20} /> },
];

/* ── Component ── */

export default function HomePage() {
  const { t, isBengali } = useLanguage();

  return (
    <>
      <SEOHead
        title={isBengali ? 'হোম' : 'Home'}
        description={isBengali
          ? 'দ্য লিটল ফ্লাওয়ার স্কুল — স্থাপিত ২০১৬। আধুনিক শিক্ষাব্যবস্থা, যত্নশীল শিক্ষক এবং শিক্ষার্থীবান্ধব পরিবেশ।'
          : 'The Little Flower School — Est. 2016. Modern education, caring teachers, student-friendly environment.'}
        canonical="/"
      />

      {/* ════════════════════════════════════════════
          HERO SECTION
          ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background image with fallback gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/students-studying.jpg)',
          }}
        />
        {/* Fallback gradient (visible if image fails to load) */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-dark via-navy to-royal" />
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark/90 via-navy-dark/70 to-navy-dark/30" />

        {/* Content */}
        <div className="container-page relative z-10 py-16 md:py-24 lg:py-28">
          <div className="max-w-2xl">
            {/* Gold accent line */}
            <div className="mb-4 h-1 w-12 rounded-full bg-gold" />

            {/* Small label */}
            <p className="mb-3 text-sm font-medium tracking-wide text-gold-soft">
              {t('hero.label')}
            </p>

            {/* Heading */}
            <h1 className="mb-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl font-bengali">
              {t('hero.heading')}
            </h1>

            {/* Sub-heading */}
            <p className="mb-3 text-lg font-semibold text-gold md:text-xl">
              {t('hero.subheading')}
            </p>

            {/* Description */}
            <p className="mb-8 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
              {t('hero.description')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              <Link to="/admission" className="btn-primary text-base">
                {t('hero.ctaPrimary')}
              </Link>
              <Link to="/school-info" className="btn-secondary text-base">
                {t('hero.ctaSecondary')}
              </Link>
            </div>

            {/* Info line */}
            <p className="mt-6 text-xs font-medium tracking-wider text-white/50">
              {t('hero.infoLine')}
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          1. QUICK ACTION CARDS
          ════════════════════════════════════════════ */}
      <section className="container-page -mt-8 relative z-20 mb-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="card-hover flex flex-col items-center gap-2 p-4 text-center md:p-6"
            >
              <div className={`rounded-xl p-3 text-white ${action.color}`}>
                {action.icon}
              </div>
              <span className="text-sm font-semibold text-navy">
                {isBengali ? action.iconBn : action.iconEn}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          2. ABOUT SCHOOL
          ════════════════════════════════════════════ */}
      <section className="container-page mb-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="section-title">{t('home.aboutTitle')}</h2>
            <div className="mt-1 h-1 w-10 rounded-full bg-gold" />
            <p className="mt-4 text-sm leading-relaxed text-ink-light md:text-base">
              {t('home.aboutText')}
            </p>
            <Link
              to="/school-info"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-royal hover:underline"
            >
              {t('home.learnMore')} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="rounded-2xl bg-navy/5 p-8 text-center">
            <GraduationCap size={64} className="mx-auto text-navy/20" />
            <p className="mt-4 text-sm text-ink-light">
              {t('common.editableSample')}
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          3. ADMISSION ANNOUNCEMENT
          ════════════════════════════════════════════ */}
      <section className="bg-navy py-12">
        <div className="container-page flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gold font-bengali">
              {t('home.admissionAnnouncement')}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {t('home.admissionText')}
            </p>
          </div>
          <Link to="/admission" className="btn-primary shrink-0">
            {t('hero.ctaPrimary')}
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          4. PRINCIPAL'S MESSAGE
          ════════════════════════════════════════════ */}
      <section className="container-page py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-title">{t('home.principalMessage')}</h2>
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-gold" />
          <blockquote className="mt-6 text-sm leading-relaxed text-ink-light italic md:text-base">
            "{t('home.principalText')}"
          </blockquote>
          <div className="mt-4">
            <p className="font-semibold text-navy">{t('home.principalName')}</p>
            <p className="text-xs text-ink-light">{t('home.principalTitle')}</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          5. CLASSES & ACADEMIC INFO
          ════════════════════════════════════════════ */}
      <section className="bg-surface py-16">
        <div className="container-page text-center">
          <h2 className="section-title">{t('home.classesTitle')}</h2>
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-gold" />
          <p className="mx-auto mt-4 max-w-xl text-sm text-ink-light">
            {t('home.classesText')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {['Play', 'Nursery', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(
              (cls) => (
                <span
                  key={cls}
                  className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-navy shadow-card"
                >
                  {isBengali ? `শ্রেণি ${cls}` : `Class ${cls}`}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          6. LATEST NOTICES
          ════════════════════════════════════════════ */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="section-title">{t('home.latestNotices')}</h2>
            <div className="mt-1 h-1 w-10 rounded-full bg-gold" />
          </div>
          <Link
            to="/notices"
            className="hidden items-center gap-1 text-sm font-semibold text-royal hover:underline sm:inline-flex"
          >
            {t('home.viewAll')} <ChevronRight size={14} />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="mb-2 text-xs text-ink-light">
                {t('common.editableSample')}
              </div>
              <h3 className="text-sm font-semibold text-navy">
                {t('common.editableSample')}
              </h3>
              <p className="mt-1 text-xs text-ink-light line-clamp-2">
                {t('common.editableSample')}
              </p>
            </div>
          ))}
        </div>
        <Link
          to="/notices"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-royal hover:underline sm:hidden"
        >
          {t('home.viewAll')} <ChevronRight size={14} />
        </Link>
      </section>

      {/* ════════════════════════════════════════════
          7. RESULT LOOKUP SHORTCUT
          ════════════════════════════════════════════ */}
      <section className="bg-navy py-12">
        <div className="container-page flex flex-col items-center gap-4 text-center">
          <Award size={36} className="text-gold" />
          <h2 className="text-xl font-bold text-white font-bengali">
            {t('home.resultShortcut')}
          </h2>
          <p className="max-w-md text-sm text-white/70">
            {t('home.resultShortcutText')}
          </p>
          <Link to="/results" className="btn-primary">
            {t('results.lookup')}
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          8. PAYMENT & FEE INFO
          ════════════════════════════════════════════ */}
      <section className="container-page py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="section-title">{t('home.feeInfo')}</h2>
            <div className="mt-1 h-1 w-10 rounded-full bg-gold" />
            <p className="mt-4 text-sm leading-relaxed text-ink-light">
              {t('home.feeInfoText')}
            </p>
            <Link to="/payments" className="btn-outline mt-6">
              {t('nav.payments')}
            </Link>
          </div>
          <div className="card bg-surface">
            <CreditCard size={32} className="text-navy/20" />
            <p className="mt-3 text-sm text-ink-light">
              {t('common.editableSample')}
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          9. GALLERY
          ════════════════════════════════════════════ */}
      <section className="bg-surface py-16">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="section-title">{t('home.galleryTitle')}</h2>
              <div className="mt-1 h-1 w-10 rounded-full bg-gold" />
            </div>
            <Link
              to="/gallery"
              className="hidden items-center gap-1 text-sm font-semibold text-royal hover:underline sm:inline-flex"
            >
              {t('home.viewAll')} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-xl bg-navy/5"
              >
                <ImageIcon size={32} className="text-navy/15" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          10. FACILITIES & HIGHLIGHTS
          ════════════════════════════════════════════ */}
      <section className="container-page py-16">
        <div className="text-center">
          <h2 className="section-title">{t('home.facilitiesTitle')}</h2>
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-gold" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACILITIES.map((f, i) => (
            <div key={i} className="card-hover flex flex-col items-center gap-3 p-6 text-center">
              <div className="rounded-full bg-royal/10 p-3 text-royal">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-navy">
                {isBengali ? f.iconBn : f.iconEn}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          11. CONTACT + MAP
          ════════════════════════════════════════════ */}
      <section className="bg-navy py-16">
        <div className="container-page">
          <h2 className="mb-8 text-center text-2xl font-bold text-white font-bengali">
            {t('home.contactTitle')}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-start gap-3 text-white/80">
              <MapPin size={18} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-semibold text-white">{t('contact.address')}</p>
                <p className="mt-1 text-sm">{t('common.editableSample')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-white/80">
              <Phone size={18} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-semibold text-white">{t('contact.phoneLabel')}</p>
                <p className="mt-1 text-sm">{t('common.editableSample')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-white/80">
              <Mail size={18} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <p className="text-sm font-semibold text-white">{t('contact.emailLabel')}</p>
                <p className="mt-1 text-sm">{t('common.editableSample')}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link to="/contact" className="btn-secondary">
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
        }
