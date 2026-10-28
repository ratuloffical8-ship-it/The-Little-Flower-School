// src/features/admission/StepStudent.tsx
import { useLanguage } from '@/hooks/useLanguage';
import { toBengaliDigits } from '@/utils/format';
import type { AdmissionFormData } from '@/types/admission';

const CLASSES = [
  { value: 'play', bn: 'প্লে', en: 'Play' },
  { value: 'nursery', bn: 'নার্সারি', en: 'Nursery' },
  { value: '1', bn: '১', en: '1' },
  { value: '2', bn: '২', en: '2' },
  { value: '3', bn: '৩', en: '3' },
  { value: '4', bn: '৪', en: '4' },
  { value: '5', bn: '৫', en: '5' },
  { value: '6', bn: '৬', en: '6' },
  { value: '7', bn: '৭', en: '7' },
  { value: '8', bn: '৮', en: '8' },
  { value: '9', bn: '৯', en: '9' },
  { value: '10', bn: '১০', en: '10' },
];

const GENDERS = [
  { value: 'male', bn: 'ছেলে', en: 'Male' },
  { value: 'female', bn: 'মেয়ে', en: 'Female' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const RELIGIONS_BN = ['ইসলাম', 'হিন্দু', 'খ্রিস্টান', 'বৌদ্ধ', 'অন্যান্য'];
const RELIGIONS_EN = ['Islam', 'Hindu', 'Christian', 'Buddhist', 'Other'];

interface Props {
  data: AdmissionFormData;
  errors: Record<string, string>;
  onChange: <K extends keyof AdmissionFormData>(key: K, value: AdmissionFormData[K]) => void;
}

export default function StepStudent({ data, errors, onChange }: Props) {
  const { t, isBengali, locale } = useLanguage();

  const field = (
    key: keyof AdmissionFormData,
    label: string,
    type = 'text',
    required = true,
    placeholder = ''
  ) => (
    <div>
      <label className="label" htmlFor={`adm-${key}`}>
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        id={`adm-${key}`}
        type={type}
        className={`input-field ${errors[key] ? 'border-error' : ''}`}
        value={(data[key] as string) ?? ''}
        onChange={(e) => onChange(key, e.target.value as any)}
        placeholder={placeholder}
        required={required}
      />
      {errors[key] && <p className="error-text">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-light mb-2">
        {isBengali
          ? 'শিক্ষার্থীর সঠিক তথ্য দিন। জন্ম নিবন্ধন অনুযায়ী নাম লিখুন।'
          : 'Enter accurate student information. Write the name as per birth certificate.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {field('studentNameBn', isBengali ? 'শিক্ষার্থীর নাম (বাংলা)' : 'Student Name (Bengali)', 'text', true, isBengali ? 'বাংলায় নাম' : 'Name in Bengali')}
        {field('studentNameEn', isBengali ? 'শিক্ষার্থীর নাম (English)' : 'Student Name (English)', 'text', true, 'Name in English')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {field('dateOfBirth', isBengali ? 'জন্ম তারিখ' : 'Date of Birth', 'date')}

        <div>
          <label className="label" htmlFor="adm-gender">
            {isBengali ? 'লিঙ্গ' : 'Gender'} <span className="text-error">*</span>
          </label>
          <select
            id="adm-gender"
            className={`input-field ${errors.gender ? 'border-error' : ''}`}
            value={data.gender}
            onChange={(e) => onChange('gender', e.target.value as any)}
          >
            <option value="">{isBengali ? 'নির্বাচন করুন' : 'Select'}</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {locale === 'bn' ? g.bn : g.en}
              </option>
            ))}
          </select>
          {errors.gender && <p className="error-text">{errors.gender}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="adm-classApplyingFor">
            {isBengali ? 'যে শ্রেণিতে ভর্তি হতে চান' : 'Class Applying For'} <span className="text-error">*</span>
          </label>
          <select
            id="adm-classApplyingFor"
            className={`input-field ${errors.classApplyingFor ? 'border-error' : ''}`}
            value={data.classApplyingFor}
            onChange={(e) => onChange('classApplyingFor', e.target.value)}
          >
            <option value="">{isBengali ? 'শ্রেণি নির্বাচন করুন' : 'Select class'}</option>
            {CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {isBengali ? `শ্রেণি ${c.bn}` : `Class ${c.en}`}
              </option>
            ))}
          </select>
          {errors.classApplyingFor && <p className="error-text">{errors.classApplyingFor}</p>}
        </div>

        {field('previousSchool', isBengali ? 'পূর্ববর্তী বিদ্যালয়' : 'Previous School', 'text', false, isBengali ? 'প্রযোজ্য না হলে খালি রাখুন' : 'Leave blank if not applicable')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="label" htmlFor="adm-religion">
            {isBengali ? 'ধর্ম' : 'Religion'} <span className="text-error">*</span>
          </label>
          <select
            id="adm-religion"
            className={`input-field ${errors.religion ? 'border-error' : ''}`}
            value={data.religion}
            onChange={(e) => onChange('religion', e.target.value)}
          >
            <option value="">{isBengali ? 'নির্বাচন করুন' : 'Select'}</option>
            {(isBengali ? RELIGIONS_BN : RELIGIONS_EN).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.religion && <p className="error-text">{errors.religion}</p>}
        </div>

        {field('nationality', isBengali ? 'জাতীয়তা' : 'Nationality', 'text', true, isBengali ? 'বাংলাদেশী' : 'Bangladeshi')}

        <div>
          <label className="label" htmlFor="adm-bloodGroup">
            {isBengali ? 'রক্তের গ্রুপ' : 'Blood Group'}
          </label>
          <select
            id="adm-bloodGroup"
            className="input-field"
            value={data.bloodGroup}
            onChange={(e) => onChange('bloodGroup', e.target.value)}
          >
            <option value="">{isBengali ? 'নির্বাচন করুন (ঐচ্ছিক)' : 'Select (optional)'}</option>
            {BLOOD_GROUPS.filter(Boolean).map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
    }
