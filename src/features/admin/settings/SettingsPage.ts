// src/features/admin/settings/SettingsPage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

type Json = Record<string, unknown>;

interface FieldDef {
  key: 'schoolName' | 'address' | 'phone' | 'email' | 'bkashNumber' | 'nagadNumber';
  bn: string;
  en: string;
  required?: boolean;
  multiline?: boolean;
  max: number;
  kind: 'text' | 'phone' | 'email' | 'mobile';
}

const FIELDS: FieldDef[] = [
  { key: 'schoolName', bn: 'স্কুলের নাম', en: 'School name', required: true, max: 150, kind: 'text' },
  { key: 'address', bn: 'ঠিকানা', en: 'Address', multiline: true, max: 300, kind: 'text' },
  { key: 'phone', bn: 'ফোন', en: 'Phone', max: 20, kind: 'phone' },
  { key: 'email', bn: 'ইমেইল', en: 'Email', max: 120, kind: 'email' },
  { key: 'bkashNumber', bn: 'বিকাশ নম্বর', en: 'bKash number', max: 20, kind: 'mobile' },
  { key: 'nagadNumber', bn: 'নগদ নম্বর', en: 'Nagad number', max: 20, kind: 'mobile' },
];

const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-\s()]{6,20}$/;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function toForm(item: Json | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = item?.[f.key];
    out[f.key] = typeof v === 'string' ? v : v == null ? '' : String(v);
  }
  return out;
}

export default function SettingsPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const { data, isLoading, isWaking, error, execute } = useApiGet<{ item: Json } | Json>('/api/settings', []);
  const save = useApi<{ success?: boolean; item?: Json }>('PUT');

  const loaded: Json | undefined = (() => {
    if (!data) return undefined;
    const d = data as Json;
    return isObj(d.item) ? d.item : d;
  })();

  const [original, setOriginal] = useState<Record<string, string>>(() => toForm(undefined));
  const [form, setForm] = useState<Record<string, string>>(() => toForm(undefined));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded) {
      const f = toForm(loaded);
      setOriginal(f);
      setForm(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const changedKeys = FIELDS.filter((f) => form[f.key].trim() !== original[f.key].trim()).map((f) => f.key);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = form[f.key].trim();
      if (f.required && !v) e[f.key] = tr('আবশ্যক', 'Required');
      else if (v.length > f.max) e[f.key] = tr(`সর্বোচ্চ ${f.max} অক্ষর`, `Max ${f.max} characters`);
      else if (v) {
        if (f.kind === 'mobile' && !BD_MOBILE.test(v)) e[f.key] = tr('সঠিক মোবাইল নম্বর দিন', 'Enter a valid BD mobile number');
        if (f.kind === 'email' && !EMAIL.test(v)) e[f.key] = tr('সঠিক ইমেইল দিন', 'Enter a valid email');
        if (f.kind === 'phone' && !PHONE.test(v)) e[f.key] = tr('সঠিক ফোন নম্বর দিন', 'Enter a valid phone number');
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (saving) return;
    setSaved(false);
    setFormError('');
    if (!validate() || changedKeys.length === 0) return;
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      for (const k of changedKeys) body[k] = form[k].trim();
      const res = await save.execute('/api/settings', body);
      const item = res && isObj(res.item) ? res.item : undefined;
      if (item) {
        const f = toForm(item);
        setOriginal(f);
        setForm(f);
      } else {
        await execute();
      }
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tr('সংরক্ষণ করা যায়নি', 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="section-title">{tr('স্কুল সেটিংস', 'School Settings')}</h1>

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('সেটিংস লোড করা যায়নি।', 'Could not load settings.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="card text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</div>
      ) : (
        <form className="card max-w-2xl space-y-4" onSubmit={submit} noValidate>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label" htmlFor={`st-${f.key}`}>
                {isBengali ? f.bn : f.en} {f.required && '*'}
              </label>
              {f.multiline ? (
                <textarea
                  id={`st-${f.key}`}
                  rows={3}
                  className="input-field"
                  value={form[f.key]}
                  onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setSaved(false); }}
                />
              ) : (
                <input
                  id={`st-${f.key}`}
                  className="input-field"
                  inputMode={f.kind === 'mobile' || f.kind === 'phone' ? 'tel' : undefined}
                  value={form[f.key]}
                  onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setSaved(false); }}
                />
              )}
              {errors[f.key] && <p className="error-text">{errors[f.key]}</p>}
            </div>
          ))}

          <p className="text-xs text-ink/60">
            {tr(
              'বিকাশ ও নগদ নম্বর পাবলিক পেমেন্ট পেজে দেখানো হয়। ভুল নম্বর দিলে অভিভাবকদের টাকা ভুল নম্বরে যাবে।',
              'The bKash and Nagad numbers are shown on the public payment page. A wrong number sends parents’ money to the wrong account.',
            )}
          </p>

          {formError && <p className="error-text">{formError}</p>}
          {saved && <p className="text-sm text-green-700">{tr('সংরক্ষিত হয়েছে।', 'Saved.')}</p>}
          {!saved && changedKeys.length === 0 && !isLoading && (
            <p className="text-xs text-ink/50">{tr('কোনো পরিবর্তন নেই।', 'No changes yet.')}</p>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={saving || changedKeys.length === 0} className="btn-primary disabled:opacity-60">
              {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ', 'Save')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
  }
