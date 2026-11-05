// src/features/admin/settings/SettingsPage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

type Json = Record<string, unknown>;

interface FieldDef {
  key: string;
  bn: string;
  en: string;
  hintBn?: string;
  hintEn?: string;
  required?: boolean;
  rows?: number;
  max: number;
  kind: 'text' | 'phone' | 'email' | 'mobile' | 'url';
}

interface Group {
  titleBn: string;
  titleEn: string;
  noteBn?: string;
  noteEn?: string;
  fields: FieldDef[];
}

/** Every text shown on the public website is edited here. */
const GROUPS: Group[] = [
  {
    titleBn: 'স্কুলের নাম',
    titleEn: 'School name',
    fields: [
      { key: 'schoolNameBn', bn: 'স্কুলের নাম (বাংলা)', en: 'School name (Bangla)', required: true, max: 150, kind: 'text' },
      { key: 'schoolNameEn', bn: 'স্কুলের নাম (English)', en: 'School name (English)', required: true, max: 150, kind: 'text' },
    ],
  },
  {
    titleBn: 'যোগাযোগ (ওয়েবসাইটের ফুটার, হোম ও যোগাযোগ পেইজে দেখাবে)',
    titleEn: 'Contact (shown in footer, home and contact page)',
    fields: [
      { key: 'address', bn: 'ঠিকানা', en: 'Address', rows: 3, max: 300, kind: 'text' },
      { key: 'phone', bn: 'ফোন নম্বর', en: 'Phone', max: 30, kind: 'phone' },
      { key: 'email', bn: 'ইমেইল', en: 'Email', max: 120, kind: 'email' },
      {
        key: 'officeHours',
        bn: 'অফিস সময়',
        en: 'Office hours',
        hintBn: 'যেমন: শনি–বৃহস্পতি, সকাল ৯টা – দুপুর ২টা',
        hintEn: 'e.g. Sat–Thu, 9 AM – 2 PM',
        max: 120,
        kind: 'text',
      },
      {
        key: 'mapUrl',
        bn: 'গুগল ম্যাপের লিংক',
        en: 'Google Maps link',
        hintBn: 'গুগল ম্যাপে স্কুল খুলে "শেয়ার" থেকে লিংক কপি করে বসান',
        hintEn: 'Open the school on Google Maps → Share → copy link',
        max: 300,
        kind: 'url',
      },
    ],
  },
  {
    titleBn: 'ফেসবুক ও ইউটিউব',
    titleEn: 'Facebook & YouTube',
    noteBn: 'এখানে আপনার পেইজ/চ্যানেলের লিংক বসান। ওয়েবসাইটের নিচে বোতামে চাপ দিলে মানুষ সেখানে যাবে। ফাঁকা রাখলে বোতাম দেখাবে না।',
    noteEn: 'Paste your page / channel links. The buttons in the website footer open them. Leave empty to hide a button.',
    fields: [
      { key: 'facebook', bn: 'ফেসবুক পেইজের লিংক', en: 'Facebook page link', hintBn: 'যেমন: https://facebook.com/আপনার-পেইজ', hintEn: 'e.g. https://facebook.com/your-page', max: 300, kind: 'url' },
      { key: 'youtube', bn: 'ইউটিউব চ্যানেলের লিংক', en: 'YouTube channel link', hintBn: 'যেমন: https://youtube.com/@আপনার-চ্যানেল', hintEn: 'e.g. https://youtube.com/@your-channel', max: 300, kind: 'url' },
    ],
  },
  {
    titleBn: 'হোম পেইজের লেখা',
    titleEn: 'Home page text',
    fields: [
      { key: 'aboutText', bn: '"আমাদের স্কুল সম্পর্কে" লেখা', en: '"About our school" text', rows: 4, max: 1200, kind: 'text', hintBn: 'ফাঁকা রাখলে সাধারণ লেখা দেখাবে', hintEn: 'Empty = default text' },
      { key: 'admissionText', bn: '"ভর্তি চলছে" ঘোষণা', en: '"Admission open" announcement', rows: 2, max: 500, kind: 'text', hintBn: 'ফাঁকা রাখলে সাধারণ লেখা দেখাবে', hintEn: 'Empty = default text' },
    ],
  },
  {
    titleBn: 'প্রধান শিক্ষকের বাণী',
    titleEn: "Head teacher's message",
    fields: [
      { key: 'principalName', bn: 'প্রধান শিক্ষকের নাম', en: "Head teacher's name", max: 100, kind: 'text' },
      { key: 'principalTitle', bn: 'পদবি', en: 'Title', hintBn: 'যেমন: প্রধান শিক্ষক', hintEn: 'e.g. Head Teacher', max: 100, kind: 'text' },
      { key: 'principalMessage', bn: 'বাণী', en: 'Message', rows: 5, max: 2000, kind: 'text' },
    ],
  },
  {
    titleBn: 'ফি জমার নম্বর',
    titleEn: 'Payment numbers',
    noteBn: 'বিকাশ ও নগদ নম্বর পাবলিক পেমেন্ট পেজে দেখানো হয়। ভুল নম্বর দিলে অভিভাবকদের টাকা ভুল নম্বরে যাবে।',
    noteEn: 'The bKash and Nagad numbers are shown on the public payment page. A wrong number sends parents’ money to the wrong account.',
    fields: [
      { key: 'bkashNumber', bn: 'বিকাশ নম্বর', en: 'bKash number', max: 20, kind: 'mobile' },
      { key: 'nagadNumber', bn: 'নগদ নম্বর', en: 'Nagad number', max: 20, kind: 'mobile' },
    ],
  },
];

const FIELDS: FieldDef[] = GROUPS.flatMap((g) => g.fields);

const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-\s()]{5,30}$/;
const URL_LIKE = /^(?:https?:\/\/)?[^\s/]+\.[^\s]+$/i;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function toForm(item: Json | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  const social = isObj(item?.socialLinks) ? (item!.socialLinks as Json) : {};
  for (const f of FIELDS) {
    const v = f.key === 'facebook' || f.key === 'youtube' ? social[f.key] : item?.[f.key];
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
        if (f.kind === 'url' && !URL_LIKE.test(v)) e[f.key] = tr('সঠিক লিংক দিন', 'Enter a valid link');
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

  const set = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
    setSaved(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title">{tr('স্কুল সেটিংস ও ওয়েবসাইটের লেখা', 'School settings & website text')}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {tr(
            'এখানে যা লিখে সংরক্ষণ করবেন তা ওয়েবসাইটে দেখা যাবে (১ মিনিটের মধ্যে)।',
            'Whatever you save here appears on the public website (within a minute).',
          )}
        </p>
      </div>

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
        <form className="max-w-2xl space-y-4" onSubmit={submit} noValidate>
          {GROUPS.map((g) => (
            <div key={g.titleEn} className="card space-y-4">
              <div>
                <h2 className="text-base font-bold text-navy">{tr(g.titleBn, g.titleEn)}</h2>
                {g.noteBn && <p className="mt-1 text-xs text-ink/60">{tr(g.noteBn, g.noteEn ?? '')}</p>}
              </div>
              {g.fields.map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={`st-${f.key}`}>
                    {isBengali ? f.bn : f.en} {f.required && '*'}
                  </label>
                  {f.rows ? (
                    <textarea
                      id={`st-${f.key}`}
                      rows={f.rows}
                      className="input-field"
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      id={`st-${f.key}`}
                      className="input-field"
                      inputMode={
                        f.kind === 'mobile' || f.kind === 'phone' ? 'tel' : f.kind === 'url' ? 'url' : undefined
                      }
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                  {f.hintBn && <p className="mt-1 text-xs text-ink/50">{tr(f.hintBn, f.hintEn ?? '')}</p>}
                  {errors[f.key] && <p className="error-text">{errors[f.key]}</p>}
                </div>
              ))}
            </div>
          ))}

          {formError && <p className="error-text">{formError}</p>}
          {saved && <p className="text-sm text-green-700">{tr('সংরক্ষিত হয়েছে।', 'Saved.')}</p>}
          {!saved && changedKeys.length === 0 && !isLoading && (
            <p className="text-xs text-ink/50">{tr('কোনো পরিবর্তন নেই।', 'No changes yet.')}</p>
          )}

          <div className="sticky bottom-3 flex justify-end">
            <button
              type="submit"
              disabled={saving || changedKeys.length === 0}
              className="btn-primary shadow-lg disabled:opacity-60"
            >
              {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ', 'Save')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
        }
