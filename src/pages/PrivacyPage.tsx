// src/pages/PrivacyPage.tsx
import { useLanguage } from '@/hooks/useLanguage';
import SEOHead from '@/components/SEOHead';

const bnSections = [
  {
    title: '১. তথ্য সংগ্রহ',
    body: 'আমরা ভর্তি আবেদন, যোগাযোগ ফর্ম এবং পেমেন্ট প্রক্রিয়ার মাধ্যমে আপনার নাম, মোবাইল নম্বর, ঠিকানা, শিক্ষার্থীর তথ্য এবং প্রয়োজনীয় নথি সংগ্রহ করি। এই তথ্যগুলো শুধুমাত্র বিদ্যালয়ের প্রশাসনিক কাজে ব্যবহৃত হয়।',
  },
  {
    title: '২. তথ্য ব্যবহার',
    body: 'সংগৃহীত তথ্য ভর্তি প্রক্রিয়া, ফলাফল প্রকাশ, নোটিশ প্রদান এবং বিদ্যালয়ের অভ্যন্তরীণ প্রশাসনিক কার্যক্রমে ব্যবহৃত হয়। কোনো তথ্য তৃতীয় পক্ষের কাছে বিক্রি বা হস্তান্তর করা হয় না।',
  },
  {
    title: '৩. তথ্য সুরক্ষা',
    body: 'আমরা Firebase-এর এন্টারপ্রাইজ-গ্রেড নিরাপত্তা ব্যবস্থা ব্যবহার করি। সকল ডেটা এনক্রিপ্টেড অবস্থায় সংরক্ষিত থাকে। শুধুমাত্র অনুমোদিত প্রশাসকগণ ডেটা অ্যাক্সেস করতে পারেন।',
  },
  {
    title: '৪. কুকি ও ট্র্যাকিং',
    body: 'আমাদের ওয়েবসাইট স্প্যাম প্রতিরোধে reCAPTCHA ব্যবহার করে। আমরা কোনো বিজ্ঞাপন ট্র্যাকিং কুকি ব্যবহার করি না।',
  },
  {
    title: '৫. ডেটা সংরক্ষণকাল',
    body: 'ভর্তি আবেদনের তথ্য সংশ্লিষ্ট শিক্ষাবর্ষ শেষ হওয়ার পর আরও ৩ বছর সংরক্ষিত থাকে। এরপর তা স্থায়ীভাবে মুছে ফেলা হয়।',
  },
  {
    title: '৬. আপনার অধিকার',
    body: 'আপনি যেকোনো সময় আপনার ব্যক্তিগত তথ্য দেখতে, সংশোধন করতে বা মুছে ফেলতে অনুরোধ জানাতে পারেন। এর জন্য বিদ্যালয় অফিসে যোগাযোগ করুন।',
  },
  {
    title: '৭. যোগাযোগ',
    body: 'গোপনীয়তা সংক্রান্ত কোনো প্রশ্ন থাকলে বিদ্যালয় অফিসে সরাসরি যোগাযোগ করুন।',
  },
];

const enSections = [
  {
    title: '1. Information Collection',
    body: 'We collect your name, mobile number, address, student information, and required documents through admission applications, contact forms, and payment processes. This information is used solely for school administrative purposes.',
  },
  {
    title: '2. Information Usage',
    body: 'Collected data is used for admission processing, result publication, notice distribution, and internal administrative activities. No information is sold or transferred to third parties.',
  },
  {
    title: '3. Data Security',
    body: 'We use Firebase enterprise-grade security. All data is stored encrypted. Only authorized administrators can access the data.',
  },
  {
    title: '4. Cookies & Tracking',
    body: 'Our website uses reCAPTCHA for spam prevention. We do not use any advertising tracking cookies.',
  },
  {
    title: '5. Data Retention',
    body: 'Admission application data is retained for 3 years after the relevant academic year ends, after which it is permanently deleted.',
  },
  {
    title: '6. Your Rights',
    body: 'You may request to view, correct, or delete your personal data at any time by contacting the school office.',
  },
  {
    title: '7. Contact',
    body: 'For any privacy-related queries, please contact the school office directly.',
  },
];

export default function PrivacyPage() {
  const { t, isBengali } = useLanguage();
  const sections = isBengali ? bnSections : enSections;

  return (
    <>
      <SEOHead
        title={t('privacy.title')}
        description={isBengali ? 'গোপনীয়তা নীতি — দ্য লিটল ফ্লাওয়ার স্কুল' : 'Privacy Policy — The Little Flower School'}
        canonical="/privacy"
      />
      <div className="container-page py-10">
        <h1 className="section-title text-center mb-2">{t('privacy.title')}</h1>
        <p className="text-center text-ink-light text-sm mb-8">
          {t('privacy.lastUpdated')}
        </p>

        <div className="card max-w-3xl mx-auto p-6 md:p-8 space-y-6">
          <p className="text-ink leading-relaxed">
            {isBengali
              ? 'দ্য লিটল ফ্লাওয়ার স্কুল আপনার গোপনীয়তাকে সম্মান করে। এই নীতিমালা ব্যাখ্যা করে আমরা কীভাবে আপনার তথ্য সংগ্রহ, ব্যবহার এবং সুরক্ষা করি। এটি একটি খসড়া নথি — চূড়ান্ত সংস্করণ বিদ্যালয় কর্তৃপক্ষ কর্তৃক অনুমোদিত হওয়ার পর প্রকাশিত হবে।'
              : 'The Little Flower School respects your privacy. This policy explains how we collect, use, and protect your information. This is a draft document — the final version will be published after approval by the school authority.'}
          </p>

          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-navy mb-1">{section.title}</h2>
              <p className="text-ink leading-relaxed text-sm">{section.body}</p>
            </div>
          ))}

          <div className="border-t border-border pt-4 mt-6">
            <p className="text-xs text-ink-light italic">
              {isBengali
                ? '⚠️ এটি একটি খসড়া গোপনীয়তা নীতি। চূড়ান্ত সংস্করণ শীঘ্রই প্রকাশিত হবে।'
                : '⚠️ This is a draft privacy policy. The final version will be published soon.'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
    }
