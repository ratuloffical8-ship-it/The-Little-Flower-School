// src/features/admission/AdmissionForm.tsx
import { useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { getIdToken } from '@/lib/firebase/auth';
import { API_BASE_URL } from '@/lib/env';
import { admissionStep1Schema, admissionStep2Schema, admissionFormSchema } from '@/utils/validation';
import LoadingSpinner from '@/components/LoadingSpinner';
import ServerWaking from '@/components/ServerWaking';
import StepStudent from './StepStudent';
import StepGuardian from './StepGuardian';
import StepDocuments from './StepDocuments';
import AdmissionConfirmation from './AdmissionConfirmation';
import type { AdmissionFormData } from '@/types/admission';

const STEPS_BN = ['শিক্ষার্থীর তথ্য', 'অভিভাবকের তথ্য', 'নথিপত্র ও পর্যালোচনা'];
const STEPS_EN = ['Student Info', 'Guardian Info', 'Documents & Review'];

const initialFormData: AdmissionFormData = {
  studentNameBn: '',
  studentNameEn: '',
  dateOfBirth: '',
  gender: '',
  classApplyingFor: '',
  previousSchool: '',
  religion: '',
  nationality: '',
  bloodGroup: '',
  fatherName: '',
  motherName: '',
  guardianName: '',
  relationship: '',
  occupation: '',
  nid: '',
  mobile: '',
  email: '',
  presentAddress: '',
  permanentAddress: '',
  monthlyIncome: '',
  photo: null,
  birthCertificate: null,
  previousReportCard: null,
  guardianNid: null,
};

export default function AdmissionForm() {
  const { t, isBengali, locale } = useLanguage();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<AdmissionFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<{ applicationId: string } | null>(null);

  const stepLabels = isBengali ? STEPS_BN : STEPS_EN;

  const updateField = useCallback(<K extends keyof AdmissionFormData>(key: K, value: AdmissionFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateStep = (stepIndex: number): boolean => {
    let schema;
    let fields: Partial<AdmissionFormData>;

    if (stepIndex === 0) {
      schema = admissionStep1Schema;
      fields = {
        studentNameBn: formData.studentNameBn,
        studentNameEn: formData.studentNameEn,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        classApplyingFor: formData.classApplyingFor,
        previousSchool: formData.previousSchool,
        religion: formData.religion,
        nationality: formData.nationality,
        bloodGroup: formData.bloodGroup,
      };
    } else if (stepIndex === 1) {
      schema = admissionStep2Schema;
      fields = {
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        guardianName: formData.guardianName,
        relationship: formData.relationship,
        occupation: formData.occupation,
        nid: formData.nid,
        mobile: formData.mobile,
        email: formData.email,
        presentAddress: formData.presentAddress,
        permanentAddress: formData.permanentAddress,
        monthlyIncome: formData.monthlyIncome,
      };
    } else {
      return true; // Step 3 validated on final submit
    }

    const parsed = schema.safeParse(fields);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 2));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const fullParsed = admissionFormSchema.safeParse(formData);
    if (!fullParsed.success) {
      const fieldErrors: Record<string, string> = {};
      fullParsed.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setIsWaking(false);

    try {
      const body = new FormData();

      // Text fields
      const textFields: (keyof AdmissionFormData)[] = [
        'studentNameBn', 'studentNameEn', 'dateOfBirth', 'gender',
        'classApplyingFor', 'previousSchool', 'religion', 'nationality',
        'bloodGroup', 'fatherName', 'motherName', 'guardianName',
        'relationship', 'occupation', 'nid', 'mobile', 'email',
        'presentAddress', 'permanentAddress', 'monthlyIncome',
      ];
      textFields.forEach((key) => {
        const val = formData[key];
        if (typeof val === 'string') body.append(key, val);
      });

      // File fields
      const fileFields: (keyof AdmissionFormData)[] = ['photo', 'birthCertificate', 'previousReportCard', 'guardianNid'];
      fileFields.forEach((key) => {
        const file = formData[key];
        if (file instanceof File) body.append(key, file);
      });

      const headers: Record<string, string> = {};
      const token = await getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const doFetch = async () =>
        fetch(`${API_BASE_URL}/api/admission/apply`, {
          method: 'POST',
          headers,
          body,
        });

      let res = await doFetch();

      // Cold-start retry
      if ([502, 503, 504].includes(res.status)) {
        setIsWaking(true);
        await new Promise((r) => setTimeout(r, 5000));
        res = await doFetch();
        if ([502, 503, 504].includes(res.status)) {
          await new Promise((r) => setTimeout(r, 8000));
          res = await doFetch();
        }
        setIsWaking(false);
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult({ applicationId: data.applicationId });
    } catch (err: any) {
      setSubmitError(err.message || (isBengali ? 'জমা দিতে সমস্যা হয়েছে।' : 'Failed to submit.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isWaking) return <ServerWaking />;
  if (result) {
    return (
      <AdmissionConfirmation
        applicationId={result.applicationId}
        studentName={locale === 'bn' ? formData.studentNameBn : formData.studentNameEn}
        className={formData.classApplyingFor}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i < step
                    ? 'bg-success text-white'
                    : i === step
                    ? 'bg-royal text-white'
                    : 'bg-border text-ink-light'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 text-center hidden sm:block ${i === step ? 'text-royal font-semibold' : 'text-ink-light'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-royal rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
        <p className="text-center text-sm text-ink-light mt-2 sm:hidden">
          {t('admission.step')} {step + 1} / 3 — {stepLabels[step]}
        </p>
      </div>

      {/* Form Card */}
      <div className="card p-5 md:p-8">
        <h2 className="text-xl font-bold text-navy mb-6">
          {t('admission.formTitle')}
        </h2>

        {submitError && (
          <div className="bg-error/10 border border-error text-error rounded-lg p-3 mb-4 text-sm">
            {submitError}
          </div>
        )}

        {step === 0 && (
          <StepStudent data={formData} errors={errors} onChange={updateField} />
        )}
        {step === 1 && (
          <StepGuardian data={formData} errors={errors} onChange={updateField} />
        )}
        {step === 2 && (
          <StepDocuments data={formData} errors={errors} onChange={updateField} />
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          {step > 0 ? (
            <button type="button" onClick={handleBack} className="btn-outline" disabled={isSubmitting}>
              {isBengali ? '← পিছনে' : '← Back'}
            </button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <button type="button" onClick={handleNext} className="btn-primary">
              {isBengali ? 'পরবর্তী →' : 'Next →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size={16} />
                  {isBengali ? 'জমা দেওয়া হচ্ছে…' : 'Submitting…'}
                </span>
              ) : (
                isBengali ? 'আবেদন জমা দিন' : 'Submit Application'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
  }
