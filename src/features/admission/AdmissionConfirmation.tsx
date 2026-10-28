// src/features/admission/AdmissionConfirmation.tsx
import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';

interface Props {
  applicationId: string;
  studentName: string;
  className: string;
}

export default function AdmissionConfirmation({ applicationId, studentName, className }: Props) {
  const { isBengali } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="card p-6 md:p-10">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-navy mb-2">
          {isBengali ? 'আবেদন সফলভাবে জমা হয়েছে!' : 'Application Submitted Successfully!'}
        </h2>

        <p className="text-ink-light text-sm mb-6">
          {isBengali
            ? 'আপনার ভর্তি আবেদন গ্রহণ করা হয়েছে। নিচের তথ্যটি সংরক্ষণ করুন।'
            : 'Your admission application has been received. Please save the information below.'}
        </p>

        {/* Application ID Card */}
        <div className="bg-surface border-2 border-dashed border-gold rounded-xl p-5 mb-6 print:border-solid print:border-navy">
          <p className="text-xs text-ink-light uppercase tracking-wider mb-1">
            {isBengali ? 'আবেদন নম্বর' : 'Application ID'}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-navy font-mono tracking-wide select-all">
            {applicationId}
          </p>
          <div className="mt-3 text-sm text-ink space-y-1">
            <p>
              <span className="text-ink-light">{isBengali ? 'শিক্ষার্থী:' : 'Student:'}</span>{' '}
              <span className="font-medium">{studentName}</span>
            </p>
            <p>
              <span className="text-ink-light">{isBengali ? 'শ্রেণি:' : 'Class:'}</span>{' '}
              <span className="font-medium">{className}</span>
            </p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-warning/10 border border-warning rounded-lg p-3 mb-6 text-left text-sm text-ink">
          <p className="font-semibold mb-1">
            {isBengali ? '⚠️ গুরুত্বপূর্ণ:' : '⚠️ Important:'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>
              {isBengali
                ? 'এই আবেদন নম্বরটি সংরক্ষণ করুন — স্ট্যাটাস চেক করতে এটি প্রয়োজন হবে।'
                : 'Save this application ID — you will need it to check your status.'}
            </li>
            <li>
              {isBengali
                ? 'আবেদনের অবস্থা জানতে "ভর্তি স্ট্যাটাস" পেজে যান।'
                : 'Visit the "Admission Status" page to check your application progress.'}
            </li>
            <li>
              {isBengali
                ? 'প্রয়োজনে বিদ্যালয় অফিসে সরাসরি যোগাযোগ করুন।'
                : 'Contact the school office directly if needed.'}
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center print:hidden">
          <button onClick={handlePrint} className="btn-outline">
            {isBengali ? '🖨️ প্রিন্ট করুন' : '🖨️ Print'}
          </button>
          <Link to="/admission/status" className="btn-primary text-center">
            {isBengali ? 'স্ট্যাটাস চেক করুন' : 'Check Status'}
          </Link>
        </div>
      </div>
    </div>
  );
          }
