// src/features/admission/StepGuardian.tsx
import { useLanguage } from '@/hooks/useLanguage';
import type { AdmissionFormData } from '@/types/admission';

const RELATIONSHIPS_BN = ['বাবা', 'মা', 'চাচা', 'ফুফা', 'ভাই', 'অন্যান্য'];
const RELATIONSHIPS_EN = ['Father', 'Mother', 'Uncle', 'Guardian', 'Brother', 'Other'];

interface Props {
  data: AdmissionFormData;
  errors: Record<string, string>;
  onChange: <K extends keyof AdmissionFormData>(key: K, value: AdmissionFormData[K]) => void;
}

export default function StepGuardian({ data, errors, onChange }: Props) {
  const { isBengali } = useLanguage();

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

  const textarea = (
    key: keyof AdmissionFormData,
    label: string,
    required = true,
    placeholder = ''
  ) => (
    <div>
      <label className="label" htmlFor={`adm-${key}`}>
        {label} {required && <span className="text-error">*</span>}
      </label>
      <textarea
        id={`adm-${key}`}
        className={`input-field min-h-[80px] resize-y ${errors[key] ? 'border-error' : ''}`}
        value={(data[key] as string) ?? ''}
        onChange={(e) => onChange(key, e.target.value as any)}
        placeholder={placeholder}
        required={required}
        rows={3}
      />
      {errors[key] && <p className="error-text">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-light mb-2">
        {isBengali
          ? 'অভিভাবকের সঠিক তথ্য দিন। মোবাইল নম্বরটি অবশ্যই সক্রিয় হতে হবে।'
          : 'Enter accurate guardian information. The mobile number must be active.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {field('fatherName', isBengali ? 'পিতার নাম' : "Father's Name")}
        {field('motherName', isBengali ? 'মাতার নাম' : "Mother's Name")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {field('guardianName', isBengali ? 'অভিভাবকের নাম' : 'Guardian Name')}

        <div>
          <label className="label" htmlFor="adm-relationship">
            {isBengali ? 'সম্পর্ক' : 'Relationship'} <span className="text-error">*</span>
          </label>
          <select
            id="adm-relationship"
            className={`input-field ${errors.relationship ? 'border-error' : ''}`}
            value={data.relationship}
            onChange={(e) => onChange('relationship', e.target.value)}
          >
            <option value="">{isBengali ? 'নির্বাচন করুন' : 'Select'}</option>
            {(isBengali ? RELATIONSHIPS_BN : RELATIONSHIPS_EN).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.relationship && <p className="error-text">{errors.relationship}</p>}
        </div>

        {field('occupation', isBengali ? 'পেশা' : 'Occupation')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {field('nid', isBengali ? 'জাতীয় পরিচয়পত্র নম্বর (NID)' : 'National ID (NID)', 'text', true, '10 or 17 digits')}
        {field('mobile', isBengali ? 'মোবাইল নম্বর' : 'Mobile Number', 'tel', true, '01XXXXXXXXX')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {field('email', isBengali ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)', 'email', false, 'example@email.com')}
        {field('monthlyIncome', isBengali ? 'মাসিক আয় (টাকা)' : 'Monthly Income (BDT)', 'text', false, isBengali ? 'যেমন: ২৫০০০' : 'e.g. 25000')}
      </div>

      {textarea('presentAddress', isBengali ? 'বর্তমান ঠিকানা' : 'Present Address', true, isBengali ? 'বাসা/হোল্ডিং, রোড, এলাকা, জেলা' : 'House/Road, Area, District')}
      {textarea('permanentAddress', isBengali ? 'স্থায়ী ঠিকানা' : 'Permanent Address', true, isBengali ? 'বর্তমান ঠিকানার সাথে একই হলে পুনরায় লিখুন' : 'Repeat if same as present')}
    </div>
  );
  }
