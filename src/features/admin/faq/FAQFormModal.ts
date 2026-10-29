// src/features/admin/faq/FAQFormModal.tsx
import { useState, type FormEvent } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

export interface FAQItem {
  id: string;
  questionBn: string;
  questionEn: string;
  answerBn: string;
  answerEn: string;
  published: boolean;
  order?: number;
}

interface Props {
  mode: 'create' | 'edit';
  faq?: FAQItem;
  /** Suggested order for a new item (max existing + 1) */
  defaultOrder?: number;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export default function FAQFormModal({ mode, faq, defaultOrder = 1, onClose, onSaved }: Props) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const create = useApi<unknown>('POST');
  const update = useApi<unknown>('PUT');

  const [qBn, setQBn] = useState(faq?.questionBn ?? '');
  const [qEn, setQEn] = useState(faq?.questionEn ?? '');
  const [aBn, setABn] = useState(faq?.answerBn ?? '');
  const [aEn, setAEn] = useState(faq?.answerEn ?? '');
  const [published, setPublished] = useState(faq?.published ?? true);
  const [order, setOrder] = useState(String(faq?.order ?? defaultOrder));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const req = (v: string, key: string, max: number) => {
      if (!v.trim()) e[key] = tr('আবশ্যক', 'Required');
      else if (v.length > max) e[key] = tr(`সর্বোচ্চ ${max} অক্ষর`, `Max ${max} characters`);
    };
    req(qBn, 'qBn', 300);
    req(qEn, 'qEn', 300);
    req(aBn, 'aBn', 3000);
    req(aEn, 'aEn', 3000);
    const n = Number(order);
    if (order.trim() === '' || !Number.isInteger(n) || n < 0 || n > 100000) {
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
      const payload = {
        questionBn: qBn.trim(),
        questionEn: qEn.trim(),
        answerBn: aBn.trim(),
        answerEn: aEn.trim(),
        published,
        order: Number(order),
      };
      if (mode === 'create') await create.execute('/api/faq', payload);
      else await update.execute(`/api/faq/${faq!.id}`, payload);
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
            {mode === 'create' ? tr('নতুন FAQ', 'New FAQ') : tr('FAQ সম্পাদনা', 'Edit FAQ')}
          </h2>
          <button type="button" aria-label={tr('বন্ধ', 'Close')} className="text-xl" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fq-qbn">{tr('প্রশ্ন (বাংলা)', 'Question (Bengali)')} *</label>
            <textarea id="fq-qbn" rows={2} className="input-field" value={qBn} onChange={(e) => setQBn(e.target.value)} />
            {errors.qBn && <p className="error-text">{errors.qBn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="fq-qen">{tr('প্রশ্ন (ইংরেজি)', 'Question (English)')} *</label>
            <textarea id="fq-qen" rows={2} className="input-field" value={qEn} onChange={(e) => setQEn(e.target.value)} />
            {errors.qEn && <p className="error-text">{errors.qEn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="fq-abn">{tr('উত্তর (বাংলা)', 'Answer (Bengali)')} *</label>
            <textarea id="fq-abn" rows={5} className="input-field" value={aBn} onChange={(e) => setABn(e.target.value)} />
            {errors.aBn && <p className="error-text">{errors.aBn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="fq-aen">{tr('উত্তর (ইংরেজি)', 'Answer (English)')} *</label>
            <textarea id="fq-aen" rows={5} className="input-field" value={aEn} onChange={(e) => setAEn(e.target.value)} />
            {errors.aEn && <p className="error-text">{errors.aEn}</p>}
          </div>
          <div>
            <label className="label" htmlFor="fq-ord">{tr('ক্রম', 'Order')}</label>
            <input id="fq-ord" type="number" min={0} step={1} className="input-field" value={order} onChange={(e) => setOrder(e.target.value)} />
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
            {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
    }
