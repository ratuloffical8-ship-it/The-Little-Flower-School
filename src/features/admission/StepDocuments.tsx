// src/features/admission/StepDocuments.tsx
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/utils/format';
import FileUpload from '@/components/FileUpload';
import type { AdmissionFormData } from '@/types/admission';

const CLASS_LABELS: Record<string, { bn: string; en: string }> = {
  play: { bn: 'প্লে', en: 'Play' },
  nursery: { bn: 'নার্সারি', en: 'Nursery' },
  '1': { bn: '১', en: '1' }, '2': { bn: '২', en: '2' }, '3': { bn: '৩', en: '3' },
  '4': { bn: '৪', en: '4' }, '5': { bn: '৫', en: '5' }, '6': { bn: '৬', en: '6' },
  '7': { bn: '৭', en: '7' }, '8': { bn: '৮', en: '8' }, '9': { bn: '৯', en: '9' },
  '10': { bn: '১০', en: '10' },
};

interface Props {
  data: AdmissionFormData;
  errors: Record<string, string>;
  onChange: <K extends keyof AdmissionFormData>(key: K, value: AdmissionFormData[K]) => void;
}

export default function StepDocuments({ data, errors, onChange }: Props) {
  const { isBengali, locale } = useLanguage();

  const classLabel = CLASS_LABELS[data.classApplyingFor];
  const className = classLabel ? (locale === 'bn' ? classLabel.bn : classLabel.en) : data.classApplyingFor;
  const studentName = locale === 'bn' ? data.studentNameBn : data.studentNameEn;

  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-ink-light text-sm">{label}</span>
      <span className="text-ink text-sm font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Document Uploads */}
      <div>
        <h3 className="text-lg font-semibold text-navy mb-4">
          {isBengali ? '📎 প্রয়োজনীয় নথিপত্র' : '📎 Required Documents'}
        </h3>
        <p className="text-sm text-ink-light mb-4">
          {isBengali
            ? 'প্রতিটি ফাইল সর্বোচ্চ 3MB, JPG/PNG/PDF ফরম্যাটে আপলোড করুন।'
            : 'Each file max 3MB, upload in JPG/PNG/PDF format.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileUpload
            label={isBengali ? 'পাসপোর্ট সাইজ ছবি *' : 'Passport-size Photo *'}
            accept="image/jpeg,image/png"
            maxSize={3}
            value={data.photo}
            onChange={(f) => onChange('photo', f)}
            error={errors.photo}
            hint={isBengali ? 'সাদা ব্যাকগ্রাউন্ড, সর্বোচ্চ 3MB' : 'White background, max 3MB'}
          />
          <FileUpload
            label={isBengali ? 'জন্ম নিবন্ধন *' : 'Birth Certificate *'}
            accept="image/jpeg,image/png,application/pdf"
            maxSize={3}
            value={data.birthCertificate}
            onChange={(f) => onChange('birthCertificate', f)}
            error={errors.birthCertificate}
          />
          <FileUpload
            label={isBengali ? 'পূর্ববর্তী রিপোর্ট কার্ড' : 'Previous Report Card'}
            accept="image/jpeg,image/png,application/pdf"
            maxSize={3}
            value={data.previousReportCard}
            onChange={(f) => onChange('previousReportCard', f)}
            error={errors.previousReportCard}
            hint={isBengali ? 'প্রযোজ্য না হলে খালি রাখুন' : 'Leave empty if not applicable'}
          />
          <FileUpload
            label={isBengali ? 'অভিভাবকের NID' : 'Guardian NID'}
            accept="image/jpeg,image/png,application/pdf"
            maxSize={3}
            value={data.guardianNid}
            onChange={(f) => onChange('guardianNid', f)}
            error={errors.guardianNid}
          />
        </div>
      </div>

      {/* Review Summary */}
      <div>
        <h3 className="text-lg font-semibold text-navy mb-4">
          {isBengali ? '📋 তথ্য পর্যালোচনা' : '📋 Review Information'}
        </h3>
        <p className="text-sm text-ink-light mb-4">
          {isBengali
            ? 'জমা দেওয়ার আগে সকল তথ্য যাচাই করুন। ভুল থাকলে "পিছনে" বাটনে ক্লিক করে সংশোধন করুন।'
            : 'Verify all information before submitting. Click "Back" to correct any errors.'}
        </p>

        <div className="space-y-6">
          {/* Student Info */}
          <div className="bg-surface rounded-lg p-4">
            <h4 className="font-semibold text-navy text-sm mb-2">
              {isBengali ? 'শিক্ষার্থীর তথ্য' : 'Student Information'}
            </h4>
            <ReviewRow label={isBengali ? 'নাম (বাংলা)' : 'Name (BN)'} value={data.studentNameBn} />
            <ReviewRow label={isBengali ? 'নাম (English)' : 'Name (EN)'} value={data.studentNameEn} />
            <ReviewRow label={isBengali ? 'জন্ম তারিখ' : 'Date of Birth'} value={data.dateOfBirth ? formatDate(data.dateOfBirth, locale) : ''} />
            <ReviewRow label={isBengali ? 'লিঙ্গ' : 'Gender'} value={data.gender} />
            <ReviewRow label={isBengali ? 'শ্রেণি' : 'Class'} value={className} />
            <ReviewRow label={isBengali ? 'পূর্ববর্তী বিদ্যালয়' : 'Previous School'} value={data.previousSchool} />
            <ReviewRow label={isBengali ? 'ধর্ম' : 'Religion'} value={data.religion} />
            <ReviewRow label={isBengali ? 'রক্তের গ্রুপ' : 'Blood Group'} value={data.bloodGroup} />
          </div>

          {/* Guardian Info */}
          <div className="bg-surface rounded-lg p-4">
            <h4 className="font-semibold text-navy text-sm mb-2">
              {isBengali ? 'অভিভাবকের তথ্য' : 'Guardian Information'}
            </h4>
            <ReviewRow label={isBengali ? 'পিতা' : 'Father'} value={data.fatherName} />
            <ReviewRow label={isBengali ? 'মাতা' : 'Mother'} value={data.motherName} />
            <ReviewRow label={isBengali ? 'অভিভাবক' : 'Guardian'} value={data.guardianName} />
            <ReviewRow label={isBengali ? 'মোবাইল' : 'Mobile'} value={data.mobile} />
            <ReviewRow label={isBengali ? 'ইমেইল' : 'Email'} value={data.email} />
            <ReviewRow label={isBengali ? 'বর্তমান ঠিকানা' : 'Present Address'} value={data.presentAddress} />
          </div>
        </div>
      </div>
    </div>
  );
  }
