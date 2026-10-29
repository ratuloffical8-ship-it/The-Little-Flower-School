// src/features/admin/users/UserFormModal.tsx
import { useState, type FormEvent } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

export const ROLES = ['super_admin', 'school_admin', 'accountant', 'teacher', 'admission_officer'] as const;
export type UserRole = (typeof ROLES)[number];

export interface UserItem {
  uid: string;
  email: string;
  name?: string;
  role: UserRole | string;
  isActive?: boolean;
  lastLoginAt?: unknown;
}

interface Props {
  mode: 'create' | 'edit';
  user?: UserItem;
  /** True when the edited user is the signed-in admin (role/status locked in the UI) */
  isSelf?: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserFormModal({ mode, user, isSelf = false, onClose, onSaved }: Props) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const create = useApi<unknown>('POST');
  const update = useApi<unknown>('PUT');

  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [role, setRole] = useState<string>(user?.role ?? 'teacher');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(user?.isActive !== false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const roleLabel: Record<string, string> = {
    super_admin: tr('সুপার অ্যাডমিন', 'Super admin'),
    school_admin: tr('স্কুল অ্যাডমিন', 'School admin'),
    accountant: tr('হিসাবরক্ষক', 'Accountant'),
    teacher: tr('শিক্ষক', 'Teacher'),
    admission_officer: tr('ভর্তি কর্মকর্তা', 'Admission officer'),
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (mode === 'create') {
      if (!EMAIL.test(email.trim())) e.email = tr('সঠিক ইমেইল দিন', 'Enter a valid email');
      if (password.length < 8) e.password = tr('কমপক্ষে ৮ অক্ষর', 'At least 8 characters');
      else if (password.length > 128) e.password = tr('সর্বোচ্চ ১২৮ অক্ষর', 'Max 128 characters');
    }
    if (!name.trim()) e.name = tr('নাম আবশ্যক', 'Name is required');
    else if (name.length > 100) e.name = tr('সর্বোচ্চ ১০০ অক্ষর', 'Max 100 characters');
    if (!(ROLES as readonly string[]).includes(role)) e.role = tr('ভূমিকা নির্বাচন করুন', 'Choose a role');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError('');
    try {
      if (mode === 'create') {
        await create.execute('/api/users', {
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          role,
        });
      } else {
        await update.execute(`/api/users/${user!.uid}`, {
          name: name.trim(),
          role,
          isActive,
        });
      }
      await onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tr('সংরক্ষণ করা যায়নি', 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !saving && onClose()}
    >
      <form
        className="card relative mx-auto my-6 w-full max-w-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
        autoComplete="off"
      >
        <div className="flex items-start justify-between">
          <h2 className="section-title">
            {mode === 'create' ? tr('নতুন ব্যবহারকারী', 'New User') : tr('ব্যবহারকারী সম্পাদনা', 'Edit User')}
          </h2>
          <button type="button" aria-label={tr('বন্ধ', 'Close')} className="text-xl" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="us-email">{tr('ইমেইল', 'Email')} {mode === 'create' && '*'}</label>
            <input
              id="us-email"
              type="email"
              className="input-field"
              value={email}
              disabled={mode === 'edit'}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="us-name">{tr('নাম', 'Name')} *</label>
            <input id="us-name" className="input-field" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="error-text">{errors.name}</p>}
          </div>
          <div>
            <label className="label" htmlFor="us-role">{tr('ভূমিকা', 'Role')} *</label>
            <select id="us-role" className="input-field" value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel[r]}</option>
              ))}
            </select>
            {errors.role && <p className="error-text">{errors.role}</p>}
          </div>
          {mode === 'create' && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="us-pass">{tr('প্রাথমিক পাসওয়ার্ড', 'Initial password')} *</label>
              <input
                id="us-pass"
                type="password"
                className="input-field"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-ink/60">
                {tr(
                  'কমপক্ষে ৮ অক্ষর। পাসওয়ার্ড এখানে পরে বদলানো যায় না; রিসেটের জন্য Firebase কনসোল ব্যবহার করুন।',
                  'At least 8 characters. It cannot be changed here later; use the Firebase console to reset it.',
                )}
              </p>
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>
          )}
        </div>

        {mode === 'edit' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} disabled={isSelf} onChange={(e) => setIsActive(e.target.checked)} />
            {tr('সক্রিয় (লগইন করতে পারবে)', 'Active (can sign in)')}
          </label>
        )}
        {isSelf && (
          <p className="text-xs text-ink/60">
            {tr('নিজের ভূমিকা বা অবস্থা বদলানো যায় না।', 'You cannot change your own role or status.')}
          </p>
        )}
        {mode === 'edit' && (
          <p className="text-xs text-ink/60">
            {tr('ভূমিকা বদলালে বা নিষ্ক্রিয় করলে ব্যবহারকারীকে আবার লগইন করতে হবে।', 'Changing the role or deactivating signs the user out; they must sign in again.')}
          </p>
        )}

        {formError && <p className="error-text">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={onClose}>
            {tr('বাতিল', 'Cancel')}
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : mode === 'create' ? tr('তৈরি করুন', 'Create') : tr('সংরক্ষণ', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
  }
