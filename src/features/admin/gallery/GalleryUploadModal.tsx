// src/features/admin/gallery/GalleryUploadModal.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../lib/api';
import { useApi } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

export interface GalleryItem {
  id: string;
  imagePath?: string;
  imageUrl?: string;
  captionBn?: string;
  captionEn?: string;
  category: string;
  published: boolean;
  order?: number;
}

interface Props {
  mode: 'create' | 'edit';
  item?: GalleryItem;
  categories: string[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function GalleryUploadModal({ mode, item, categories, onClose, onSaved }: Props) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const putJson = useApi<unknown>('PUT');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [captionBn, setCaptionBn] = useState(item?.captionBn ?? '');
  const [captionEn, setCaptionEn] = useState(item?.captionEn ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [published, setPublished] = useState(item?.published ?? true);
  const [order, setOrder] = useState(String(item?.order ?? 0));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (mode === 'create') {
      if (!file) e.file = tr('ছবি নির্বাচন করুন', 'Please choose an image');
    }
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) e.file = tr('শুধু JPG, PNG বা WebP', 'JPG, PNG or WebP only');
      else if (file.size > MAX_IMAGE_BYTES) e.file = tr('ফাইল ৩ MB এর বেশি', 'File exceeds 3 MB');
    }
    if (captionBn.length > 200) e.captionBn = tr('সর্বোচ্চ ২০০ অক্ষর', 'Max 200 characters');
    if (captionEn.length > 200) e.captionEn = tr('সর্বোচ্চ ২০০ অক্ষর', 'Max 200 characters');
    if (!category.trim()) e.category = tr('ক্যাটাগরি আবশ্যক', 'Category is required');
    else if (category.length > 60) e.category = tr('সর্বোচ্চ ৬০ অক্ষর', 'Max 60 characters');
    const n = Number(order);
    if (order.trim() === '' || !Number.isFinite(n) || n < 0 || n > 100000 || !Number.isInteger(n)) {
      e.order = tr('০ বা তার বেশি পূর্ণসংখ্যা দিন', 'Enter a whole number ≥ 0');
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
      const meta = {
        captionBn: captionBn.trim(),
        captionEn: captionEn.trim(),
        category: category.trim(),
        published,
        order: Number(order),
      };
      if (mode === 'create') {
        const fd = new FormData();
        Object.entries(meta).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append('image', file!);
        await api.uploadFile('/api/gallery', fd);
      } else {
        // Metadata only — the image itself cannot be replaced (delete + re-upload instead)
        await putJson.execute(`/api/gallery/${item!.id}`, meta);
      }
      await onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tr('সংরক্ষণ করা যায়নি', 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const shownImage = preview || item?.imageUrl || '';

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
      >
        <div className="flex items-start justify-between">
          <h2 className="section-title">
            {mode === 'create' ? tr('ছবি আপলোড', 'Upload Photo') : tr('ছবির তথ্য সম্পাদনা', 'Edit Photo Details')}
          </h2>
          <button type="button" aria-label={tr('বন্ধ', 'Close')} className="text-xl" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        {shownImage && (
          <img src={shownImage} alt="" className="max-h-56 w-full rounded object-contain bg-surface" />
        )}

        {mode === 'create' && (
          <div>
            <label className="label" htmlFor="gl-file">{tr('ছবি', 'Image')} *</label>
            <input
              id="gl-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="input-field"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-ink/60">{tr('JPG / PNG / WebP, সর্বোচ্চ ৩ MB', 'JPG / PNG / WebP, max 3 MB')}</p>
            {errors.file && <p className="error-text">{errors.file}</p>}
          </div>
        )}
        {mode === 'edit' && (
          <p className="text-xs text-ink/60">
            {tr('ছবি বদলাতে চাইলে মুছে নতুন করে আপলোড করুন।', 'To change the image, delete it and upload a new one.')}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="gl-cbn">{tr('ক্যাপশন (বাংলা)', 'Caption (Bengali)')}</label>
            <input id="gl-cbn" className="input-field" value={captionBn} maxLength={200} onChange={(e) => setCaptionBn(e.target.value)} />
            {errors.captionBn && <p className="error-text">{errors.captionBn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="gl-cen">{tr('ক্যাপশন (ইংরেজি)', 'Caption (English)')}</label>
            <input id="gl-cen" className="input-field" value={captionEn} maxLength={200} onChange={(e) => setCaptionEn(e.target.value)} />
            {errors.captionEn && <p className="error-text">{errors.captionEn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="gl-cat">{tr('ক্যাটাগরি', 'Category')} *</label>
            <input id="gl-cat" list="gl-cat-list" className="input-field" value={category} maxLength={60} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="gl-cat-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.category && <p className="error-text">{errors.category}</p>}
          </div>
          <div>
            <label className="label" htmlFor="gl-ord">{tr('ক্রম', 'Order')}</label>
            <input id="gl-ord" type="number" min={0} step={1} className="input-field" value={order} onChange={(e) => setOrder(e.target.value)} />
            {errors.order && <p className="error-text">{errors.order}</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          {tr('প্রকাশিত', 'Published')}
        </label>

        {formError && <p className="error-text">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={onClose}>
            {tr('বাতিল', 'Cancel')}
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving
              ? tr('সংরক্ষণ হচ্ছে…', 'Saving…')
              : mode === 'create'
                ? tr('আপলোড', 'Upload')
                : tr('সংরক্ষণ', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
}
