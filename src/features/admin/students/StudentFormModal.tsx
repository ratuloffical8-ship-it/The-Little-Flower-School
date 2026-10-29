// src/features/admin/students/StudentFormModal.tsx
import { useMemo, useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi } from '../../../hooks/useApi';

interface ClassOption {
  id: string;
  nameBn: string;
  nameEn: string;
  order?: number;
}

interface StudentForEdit {
  id: string;
  studentId: string;
  name: string;
  classId: string;
  sessionId?: string;
  roll?: number | string;
  guardian?: {
    name?: string;
    mobile?: string;
    relation?: string;
    address?: string;
    nid?: string;
    email?: string;
  };
}

type Mode = 'create' | 'edit';

interface StudentFormModalProps {
  mode: Mode;
  classes: ClassOption[];
  student?: StudentForEdit;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  classId: string;
  roll: string;
  guardianName: string;
  guardianMobile: string;
  guardianRelation: string;
  guardianAddress: string;
  guardianNid: string;
  guardianEmail: string;
}

interface FormErrors {
  name?: string;
  classId?: string;
  roll?: string;
  guardianName?: string;
  guardianMobile?: string;
  guardianEmail?: string;
}

// Normalizes BD mobile — accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX.
function isValidBdMobile(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, '');
  return /^(?:\+?880|0)1[3-9]\d{8}$/.test(digits);
}

function isValidEmail(raw: string): boolean {
  // Minimal RFC-ish check — server does the strict validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

export default function StudentFormModal({
  mode,
  classes,
  student,
  onClose,
  onSaved,
}: StudentFormModalProps) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const createApi = useApi<{ success: boolean; item?: StudentForEdit }>('POST');
  const updateApi = useApi<{ success: boolean; item?: StudentForEdit }>('PUT');
  const activeApi = mode === 'create' ? createApi : updateApi;

  const initial: FormState = useMemo(
    () => ({
      name: student?.name ?? '',
      classId: student?.classId ?? '',
      roll: student?.roll != null ? String(student.roll) : '',
      guardianName: student?.guardian?.name ?? '',
      guardianMobile: student?.guardian?.mobile ?? '',
      guardianRelation: student?.guardian?.relation ?? '',
      guardianAddress: student?.guardian?.address ?? '',
      guardianNid: student?.guardian?.nid ?? '',
      guardianEmail: student?.guardian?.email ?? '',
    }),
    [student],
  );

  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.name.trim()) {
      e.name = tr('নাম আবশ্যক।', 'Name is required.');
    } else if (form.name.trim().length > 100) {
      e.name = tr(
        'নাম ১০০ অক্ষরের মধ্যে হতে হবে।',
        'Name must be 100 characters or fewer.',
      );
    }
    if (!form.classId) {
      e.classId = tr('শ্রেণি নির্বাচন করুন।', 'Select a class.');
    }
    if (form.roll.trim()) {
      const n = Number(form.roll);
      if (!Number.isInteger(n) || n < 1 || n > 999) {
        e.roll = tr(
          'রোল ১ থেকে ৯৯৯-এর মধ্যে হতে হবে।',
          'Roll must be between 1 and 999.',
        );
      }
    }
    if (!form.guardianName.trim()) {
      e.guardianName = tr(
        'অভিভাবকের নাম আবশ্যক।',
        "Guardian's name is required.",
      );
    }
    if (!form.guardianMobile.trim()) {
      e.guardianMobile = tr(
        'অভিভাবকের মোবাইল আবশ্যক।',
        "Guardian's mobile is required.",
      );
    } else if (!isValidBdMobile(form.guardianMobile.trim())) {
      e.guardianMobile = tr(
        'বৈধ বাংলাদেশি মোবাইল নম্বর দিন।',
        'Enter a valid Bangladeshi mobile number.',
      );
    }
    if (form.guardianEmail.trim() && !isValidEmail(form.guardianEmail.trim())) {
      e.guardianEmail = tr(
        'বৈধ ইমেইল দিন।',
        'Enter a valid email.',
      );
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const guardian: Record<string, string> = {
      name: form.guardianName.trim(),
      mobile: form.guardianMobile.trim(),
    };
    if (form.guardianRelation.trim()) guardian.relation = form.guardianRelation.trim();
    if (form.guardianAddress.trim()) guardian.address = form.guardianAddress.trim();
    if (form.guardianNid.trim()) guardian.nid = form.guardianNid.trim();
    if (form.guardianEmail.trim()) guardian.email = form.guardianEmail.trim();

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      classId: form.classId,
      guardian,
    };
    if (form.roll.trim()) payload.roll = Number(form.roll);

    try {
      if (mode === 'create') {
        await createApi.execute('/api/students', payload);
      } else if (student) {
        await updateApi.execute(`/api/students/${student.id}`, payload);
      }
      onSaved();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : tr('সংরক্ষণ ব্যর্থ হয়েছে।', 'Save failed.'),
      );
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === 'create'
          ? tr('নতুন শিক্ষার্থী', 'New student')
          : tr('শিক্ষার্থী সম্পাদনা', 'Edit student')
      }
    >
      <form
        onSubmit={handleSubmit}
        className="card my-8 w-full max-w-2xl space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">
            {mode === 'create'
              ? tr('নতুন শিক্ষার্থী', 'New student')
              : tr('শিক্ষার্থী সম্পাদনা', 'Edit student')}
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

        {mode === 'edit' && student && (
          <p className="rounded bg-surface px-3 py-2 font-mono text-xs text-navy">
            {student.studentId}
          </p>
        )}

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            {tr('শিক্ষার্থীর তথ্য', 'Student information')}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="s-name">
                {tr('নাম', 'Name')} *
              </label>
              <input
                id="s-name"
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
              <label className="label" htmlFor="s-class">
                {tr('শ্রেণি', 'Class')} *
              </label>
              <select
                id="s-class"
                value={form.classId}
                onChange={(e) => update('classId', e.target.value)}
                className="input-field"
                required
              >
                <option value="">
                  {tr('শ্রেণি নির্বাচন করুন', 'Select a class')}
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isBengali ? c.nameBn : c.nameEn}
                  </option>
                ))}
              </select>
              {errors.classId && (
                <p className="error-text">{errors.classId}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="s-roll">
                {tr('রোল (ঐচ্ছিক)', 'Roll (optional)')}
              </label>
              <input
                id="s-roll"
                type="number"
                min={1}
                max={999}
                value={form.roll}
                onChange={(e) => update('roll', e.target.value)}
                className="input-field"
              />
              {errors.roll && <p className="error-text">{errors.roll}</p>}
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-surface pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            {tr('অভিভাবকের তথ্য', 'Guardian information')}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="g-name">
                {tr('নাম', 'Name')} *
              </label>
              <input
                id="g-name"
                type="text"
                value={form.guardianName}
                onChange={(e) => update('guardianName', e.target.value)}
                className="input-field"
                maxLength={100}
                required
              />
              {errors.guardianName && (
                <p className="error-text">{errors.guardianName}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="g-mobile">
                {tr('মোবাইল', 'Mobile')} *
              </label>
              <input
                id="g-mobile"
                type="tel"
                value={form.guardianMobile}
                onChange={(e) => update('guardianMobile', e.target.value)}
                className="input-field"
                placeholder="01XXXXXXXXX"
                required
              />
              {errors.guardianMobile && (
                <p className="error-text">{errors.guardianMobile}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="g-relation">
                {tr('সম্পর্ক', 'Relation')}
              </label>
              <input
                id="g-relation"
                type="text"
                value={form.guardianRelation}
                onChange={(e) => update('guardianRelation', e.target.value)}
                className="input-field"
                placeholder={tr('যেমন: বাবা', 'e.g., Father')}
                maxLength={40}
              />
            </div>
            <div>
              <label className="label" htmlFor="g-nid">
                {tr('এনআইডি', 'NID')}
              </label>
              <input
                id="g-nid"
                type="text"
                value={form.guardianNid}
                onChange={(e) => update('guardianNid', e.target.value)}
                className="input-field"
                maxLength={20}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="g-email">
                {tr('ইমেইল', 'Email')}
              </label>
              <input
                id="g-email"
                type="email"
                value={form.guardianEmail}
                onChange={(e) => update('guardianEmail', e.target.value)}
                className="input-field"
                maxLength={120}
              />
              {errors.guardianEmail && (
                <p className="error-text">{errors.guardianEmail}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="g-address">
                {tr('ঠিকানা', 'Address')}
              </label>
              <textarea
                id="g-address"
                value={form.guardianAddress}
                onChange={(e) => update('guardianAddress', e.target.value)}
                rows={2}
                className="input-field"
                maxLength={300}
              />
            </div>
          </div>
        </section>

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
          <button
            type="submit"
            disabled={activeApi.isLoading}
            className="btn-primary disabled:opacity-50"
          >
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
