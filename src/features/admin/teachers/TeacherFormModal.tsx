// src/features/admin/teachers/TeacherFormModal.tsx
import { useMemo, useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi } from '../../../hooks/useApi';

interface TeacherForEdit {
  id: string;
  name: string;
  designation?: string;
  subject?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

type Mode = 'create' | 'edit';

interface TeacherFormModalProps {
  mode: Mode;
  teacher?: TeacherForEdit;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  designation: string;
  subject: string;
  phone: string;
  email: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
}

function isValidBdMobile(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, '');
  return /^(?:\+?880|0)1[3-9]\d{8}$/.test(digits);
}

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

export default function TeacherFormModal({ mode, teacher, onClose, onSaved }: TeacherFormModalProps) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const createApi = useApi<{ success: boolean }>('POST');
  const updateApi = useApi<{ success: boolean }>('PUT');
  const activeApi = mode === 'create' ? createApi : updateApi;

  const initial: FormState = useMemo(
    () => ({
      name: teacher?.name ?? '',
      designation: teacher?.designation ?? '',
      subject: teacher?.subject ?? '',
      phone: teacher?.phone ?? '',
      email: teacher?.email ?? '',
      isActive: teacher?.isActive !== false,
    }),
    [teacher],
  );

  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = tr('নাম আবশ্যক।', 'Name is required.');
    else if (form.name.trim().length > 100)
      e.name = tr('নাম ১০০ অক্ষরের মধ্যে হতে হবে।', 'Name must be ≤ 100 characters.');
    if (form.phone.trim() && !isValidBdMobile(form.phone.trim()))
      e.phone = tr('বৈধ বাংলাদেশি মোবাইল নম্বর দিন।', 'Enter a valid Bangladeshi mobile.');
    if (form.email.trim() && !isValidEmail(form.email.trim()))
      e.email = tr('বৈধ ইমেইল দিন।', 'Enter a valid email.');
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      isActive: form.isActive,
    };
    if (form.designation.trim()) payload.designation = form.designation.trim();
    if (form.subject.trim()) payload.subject = form.subject.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.email.trim()) payload.email = form.email.trim();

    try {
      if (mode === 'create') {
        await createApi.execute('/api/teachers', payload);
      } else if (teacher) {
        await updateApi.execute(`/api/teachers/${teacher.id}`, payload);
      }
      onSaved();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : tr('সংরক্ষণ ব্যর্থ হয়েছে।', 'Save failed.'),
      );
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !activeApi.isLoading) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <form onSubmit={handleSubmit} className="card my-8 w-full max-w-xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">
            {mode === 'create' ? tr('নতুন শিক্ষক', 'New teacher') : tr('শিক্ষক সম্পাদনা', 'Edit teacher')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/50 hover:text-ink"
            aria-label={tr('বন্ধ করুন', 'Close')}
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="t-name">{tr('নাম', 'Name')} *</label>
            <input
              id="t-name"
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="input-field"
              maxLength={100}
              required
            />
            {errors.name && <p className="error-text">{errors.name}</p>}
          </div>
          <div>
            <label className="label" htmlFor="t-designation">{tr('পদবি', 'Designation')}</label>
            <input
              id="t-designation"
              type="text"
              value={form.designation}
              onChange={(e) => update('designation', e.target.value)}
              className="input-field"
              maxLength={60}
            />
          </div>
          <div>
            <label className="label" htmlFor="t-subject">{tr('বিষয়', 'Subject')}</label>
            <input
              id="t-subject"
              type="text"
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              className="input-field"
              maxLength={60}
            />
          </div>
          <div>
            <label className="label" htmlFor="t-phone">{tr('মোবাইল', 'Mobile')}</label>
            <input
              id="t-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="input-field"
              placeholder="01XXXXXXXXX"
            />
            {errors.phone && <p className="error-text">{errors.phone}</p>}
          </div>
          <div>
            <label className="label" htmlFor="t-email">{tr('ইমেইল', 'Email')}</label>
            <input
              id="t-email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="input-field"
              maxLength={120}
            />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update('isActive', e.target.checked)}
                className="h-4 w-4"
              />
              {tr('সক্রিয়', 'Active')}
            </label>
          </div>
        </div>

        {submitError && <p className="error-text">{submitError}</p>}

        <div className="flex justify-end gap-3 border-t border-surface pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={activeApi.isLoading}
            className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            {tr('বাতিল', 'Cancel')}
          </button>
          <button type="submit" disabled={activeApi.isLoading} className="btn-primary disabled:opacity-50">
            {activeApi.isLoading
              ? tr('সংরক্ষণ হচ্ছে…', 'Saving…')
              : mode === 'create'
                ? tr('তৈরি করুন', 'Create')
                : tr('সংরক্ষণ করুন', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
  }
