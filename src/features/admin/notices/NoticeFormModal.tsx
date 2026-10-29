// src/features/admin/notices/NoticeFormModal.tsx
import { useState, type FormEvent } from 'react';
import { api } from '../../../lib/api';
import { useApi } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

export interface NoticeItem {
  id: string;
  titleBn: string;
  titleEn: string;
  descriptionBn?: string;
  descriptionEn?: string;
  date?: unknown;
  published: boolean;
  important: boolean;
  pdfPath?: string;
}

interface Props {
  mode: 'create' | 'edit';
  notice?: NoticeItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const MAX_PDF_BYTES = 3 * 1024 * 1024;

/** Today's date in Bangladesh time (UTC+6) as YYYY-MM-DD */
const todayBdString = (): string =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

function initialDate(v: unknown): string {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (v && typeof v === 'object') {
    const o = v as { _seconds?: number; seconds?: number };
    const s = o._seconds ?? o.seconds;
    if (typeof s === 'number') return new Date(s * 1000 + 6 * 3600 * 1000).toISOString().slice(0, 10);
  }
  return todayBdString();
}

export default function NoticeFormModal({ mode, notice, onClose, onSaved }: Props) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const putJson = useApi<unknown>('PUT');

  const [titleBn, setTitleBn] = useState(notice?.titleBn ?? '');
  const [titleEn, setTitleEn] = useState(notice?.titleEn ?? '');
  const [descBn, setDescBn] = useState(notice?.descriptionBn ?? '');
  const [descEn, setDescEn] = useState(notice?.descriptionEn ?? '');
  const [date, setDate] = useState(initialDate(notice?.date));
  const [published, setPublished] = useState(notice?.published ?? false);
  const [important, setImportant] = useState(notice?.important ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!titleBn.trim()) e.titleBn = tr('বাংলা শিরোনাম আবশ্যক', 'Bengali title is required');
    else if (titleBn.length > 200) e.titleBn = tr('সর্বোচ্চ ২০০ অক্ষর', 'Max 200 characters');
    if (!titleEn.trim()) e.titleEn = tr('ইংরেজি শিরোনাম আবশ্যক', 'English title is required');
    else if (titleEn.length > 200) e.titleEn = tr('সর্বোচ্চ ২০০ অক্ষর', 'Max 200 characters');
    if (descBn.length > 3000) e.descBn = tr('সর্বোচ্চ ৩০০০ অক্ষর', 'Max 3000 characters');
    if (descEn.length > 3000) e.descEn = tr('সর্বোচ্চ ৩০০০ অক্ষর', 'Max 3000 characters');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = tr('সঠিক তারিখ দিন', 'Enter a valid date');
    if (file) {
      if (file.type !== 'application/pdf') e.file = tr('শুধু PDF ফাইল', 'PDF files only');
      else if (file.size > MAX_PDF_BYTES) e.file = tr('ফাইল ৩ MB এর বেশি', 'File exceeds 3 MB');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError('');
    try {
      const fields = {
        titleBn: titleBn.trim(),
        titleEn: titleEn.trim(),
        descriptionBn: descBn.trim(),
        descriptionEn: descEn.trim(),
        date,
        published,
        important,
      };

      if (mode === 'create' || file) {
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)));
        if (file) fd.append('pdf', file);
        if (mode === 'create') {
          await api.uploadFile('/api/notices', fd);
        } else {
          // Replacement PDF: backend PUT /api/notices/:id accepts multipart (multer `pdf`)
          await api.uploadFile(`/api/notices/${notice!.id}`, fd, { method: 'PUT' });
        }
      } else {
        await putJson.execute(`/api/notices/${notice!.id}`, fields);
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
        className="card relative mx-auto my-6 w-full max-w-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className="flex items-start justify-between">
          <h2 className="section-title">
            {mode === 'create' ? tr('নতুন নোটিশ', 'New Notice') : tr('নোটিশ সম্পাদনা', 'Edit Notice')}
          </h2>
          <button type="button" aria-label={tr('বন্ধ', 'Close')} className="text-xl" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="nt-bn">{tr('শিরোনাম (বাংলা)', 'Title (Bengali)')} *</label>
            <input id="nt-bn" className="input-field" value={titleBn} maxLength={200} onChange={(e) => setTitleBn(e.target.value)} />
            {errors.titleBn && <p className="error-text">{errors.titleBn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="nt-en">{tr('শিরোনাম (ইংরেজি)', 'Title (English)')} *</label>
            <input id="nt-en" className="input-field" value={titleEn} maxLength={200} onChange={(e) => setTitleEn(e.target.value)} />
            {errors.titleEn && <p className="error-text">{errors.titleEn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="nd-bn">{tr('বিবরণ (বাংলা)', 'Description (Bengali)')}</label>
            <textarea id="nd-bn" rows={4} className="input-field" value={descBn} onChange={(e) => setDescBn(e.target.value)} />
            {errors.descBn && <p className="error-text">{errors.descBn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="nd-en">{tr('বিবরণ (ইংরেজি)', 'Description (English)')}</label>
            <textarea id="nd-en" rows={4} className="input-field" value={descEn} onChange={(e) => setDescEn(e.target.value)} />
            {errors.descEn && <p className="error-text">{errors.descEn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="nt-date">{tr('তারিখ', 'Date')} *</label>
            <input id="nt-date" type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            {errors.date && <p className="error-text">{errors.date}</p>}
          </div>
          <div>
            <label className="label" htmlFor="nt-pdf">
              {mode === 'edit' && notice?.pdfPath
                ? tr('PDF প্রতিস্থাপন (ঐচ্ছিক)', 'Replace PDF (optional)')
                : tr('PDF সংযুক্তি (ঐচ্ছিক)', 'PDF attachment (optional)')}
            </label>
            <input
              id="nt-pdf"
              type="file"
              accept="application/pdf"
              className="input-field"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-ink/60">{tr('সর্বোচ্চ ৩ MB', 'Max 3 MB')}</p>
            {errors.file && <p className="error-text">{errors.file}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            {tr('প্রকাশিত', 'Published')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
            {tr('গুরুত্বপূর্ণ', 'Important')}
          </label>
        </div>

        {formError && <p className="error-text">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={onClose}>
            {tr('বাতিল', 'Cancel')}
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
}
