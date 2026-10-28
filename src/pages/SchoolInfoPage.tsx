// src/pages/SchoolInfoPage.tsx
import { useLanguage } from '@/hooks/useLanguage';
import SEOHead from '@/components/SEOHead';
import { BookOpen, Target, Eye, Building, Users, Trophy } from 'lucide-react';

/* ── Sections config ── */

const SECTIONS = [
  {
    key: 'about',
    icon: <BookOpen size={24} />,
    titleBn: 'আমাদের সম্পর্কে',
    titleEn: 'About Us',
    contentBn: 'Editable sample content — ২০১৬ সালে প্রতিষ্ঠিত দ্য লিটল ফ্লাওয়ার স্কুল শিক্ষায় উৎকর্ষ ও নৈতিক মূল্যবোধ বিকাশে প্রতিশ্রুতিবদ্ধ। আমাদের অভিজ্ঞ শিক্ষকমণ্ডলী প্রতিটি শিক্ষার্থীর মেধা ও সৃজনশীলতা বিকাশে নিরলসভাবে কাজ করে যাচ্ছেন।',
    contentEn: 'Editable sample content — Established in 2016, The Little Flower School is committed to academic excellence and moral development. Our experienced faculty works tirelessly to nurture every student\'s talent and creativity.',
  },
  {
    key: 'mission',
    icon: <Target size={24} />,
    titleBn: 'লক্ষ্য ও উদ্দেশ্য',
    titleEn: 'Mission',
    contentBn: 'Editable sample content — প্রতিটি শিক্ষার্থীকে জ্ঞান, দক্ষতা ও নৈতিকতায় সমৃদ্ধ করে দেশ ও সমাজের যোগ্য নাগরিক হিসেবে গড়ে তোলা।',
    contentEn: 'Editable sample content — To develop every student into a responsible citizen enriched with knowledge, skills, and moral values.',
  },
  {
    key: 'vision',
    icon: <Eye size={24} />,
    titleBn: 'ভিশন',
    titleEn: 'Vision',
    contentBn: 'Editable sample content — আধুনিক শিক্ষা ও প্রযুক্তির সমন্বয়ে একটি আদর্শ শিক্ষাপ্রতিষ্ঠান হিসেবে আত্মপ্রকাশ করা।',
    contentEn: 'Editable sample content — To emerge as a model educational institution through the integration of modern education and technology.',
  },
  {
    key: 'infrastructure',
    icon: <Building size={24} />,
    titleBn: 'অবকাঠামো',
    titleEn: 'Infrastructure',
    contentBn: 'Editable sample content — আধুনিক শ্রেণিকক্ষ, কম্পিউটার ল্যাব, গ্রন্থাগার, বিজ্ঞানাগার এবং খেলাধুলার মাঠসহ সম্পূর্ণ শিক্ষাবান্ধব পরিবেশ।',
    contentEn: 'Editable sample content — Modern classrooms, computer lab, library, science lab, and playground providing a complete student-friendly environment.',
  },
  {
    key: 'academic',
    icon: <Users size={24} />,
    titleBn: 'শিক্ষাক্রম',
    titleEn: 'Academic Program',
    contentBn: 'Editable sample content — প্লে থেকে দশম শ্রেণি পর্যন্ত জাতীয় শিক্ষাক্রম অনুসরণ করে আধুনিক ও সৃজনশীল শিক্ষাদান পদ্ধতি ব্যবহার করা হয়।',
    contentEn: 'Editable sample content — Following the national curriculum from Play to Class 10 with modern and creative teaching methods.',
  },
  {
    key: 'cocurricular',
    icon: <Trophy size={24} />,
    titleBn: 'সহপাঠ্যক্রমিক কার্যক্রম',
    titleEn: 'Co-Curricular Activities',
    contentBn: 'Editable sample content — খেলাধুলা, সাংস্কৃতিক অনুষ্ঠান, বিতর্ক প্রতিযোগিতা, বিজ্ঞান মেলা এবং বিভিন্ন ক্লাব কার্যক্রমের মাধ্যমে শিক্ষার্থীদের সার্বিক বিকাশ নিশ্চিত করা হয়।',
    contentEn: 'Editable sample content — Sports, cultural events, debate competitions, science fairs, and various club activities ensure holistic student development.',
  },
];

/* ── Component ── */

export default function SchoolInfoPage() {
  const { t, isBengali } = useLanguage();

  return (
    <>
      <SEOHead
        title={isBengali ? 'স্কুল তথ্য' : 'School Information'}
        description={isBengali
          ? 'দ্য লিটল ফ্লাওয়ার স্কুল সম্পর্কে বিস্তারিত তথ্য — ইতিহাস, লক্ষ্য, ভিশন, অবকাঠামো ও শিক্ষাক্রম।'
          : 'Detailed information about The Little Flower School — history, mission, vision, infrastructure, and curriculum.'}
        canonical="/school-info"
      />

      {/* Page Header */}
      <section className="bg-navy py-12 md:py-16">
        <div className="container-page text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl font-bengali">
            {t('schoolInfo.title')}
          </h1>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-gold" />
          <p className="mt-3 text-sm text-white/70">
            {isBengali ? 'স্থাপিত: ২০১৬' : 'Established: 2016'}
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="container-page py-12 md:py-16">
        <div className="space-y-10">
          {SECTIONS.map((section, index) => (
            <div
              key={section.key}
              className={`flex flex-col gap-6 md:flex-row md:items-start ${
                index % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Icon */}
              <div className="flex shrink-0 items-center justify-center">
                <div className="rounded-2xl bg-royal/10 p-4 text-royal">
                  {section.icon}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-navy md:text-2xl font-bengali">
                  {isBengali ? section.titleBn : section.titleEn}
                </h2>
                <div className="mt-1 h-0.5 w-8 rounded-full bg-gold" />
                <p className="mt-3 text-sm leading-relaxed text-ink-light md:text-base">
                  {isBengali ? section.contentBn : section.contentEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
