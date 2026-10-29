// src/features/admin/payments/InvoicesListPage.tsx
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled';

interface InvoiceItem {
  id: string;
  studentId: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate?: string;
  note?: string;
  createdAt?: unknown;
}

interface ListResp {
  items: InvoiceItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;
const STATUSES: InvoiceStatus[] = ['unpaid', 'partial', 'paid', 'cancelled'];

/** Today's date in Bangladesh time (UTC+6) as YYYY-MM-DD */
const todayBdString = (): string =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

function isValidIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function CreateInvoiceModal({
  isBengali,
  defaultStudentId,
  onClose,
  onSaved,
}: {
  isBengali: boolean;
  defaultStudentId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const create = useApi<unknown>('POST');

  const [studentId, setStudentId] = useState(defaultStudentId);
  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayBdString());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!/^TLFS-STU-\d{4}-\d{4}$/i.test(studentId.trim())) {
      e.studentId = tr('সঠিক আইডি দিন (TLFS-STU-YYYY-NNNN)', 'Enter a valid ID (TLFS-STU-YYYY-NNNN)');
    }
    if (!feeType.trim()) e.feeType = tr('ফির ধরন আবশ্যক', 'Fee type is required');
    else if (feeType.length > 60) e.feeType = tr('সর্বোচ্চ ৬০ অক্ষর', 'Max 60 characters');
    const n = Number(amount);
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || !(n > 0) || n > 100000000) {
      e.amount = tr('০ এর বেশি সংখ্যা দিন (সর্বোচ্চ ২ দশমিক)', 'Enter an amount above 0 (max 2 decimals)');
    }
    if (!isValidIsoDate(dueDate)) e.dueDate = tr('সঠিক তারিখ দিন', 'Enter a valid date');
    if (note.length > 300) e.note = tr('সর্বোচ্চ ৩০০ অক্ষর', 'Max 300 characters');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError('');
    try {
      const body: Record<string, unknown> = {
        studentId: studentId.trim().toUpperCase(),
        feeType: feeType.trim(),
        amount: Number(amount),
        dueDate,
      };
      if (note.trim()) body.note = note.trim();
      await create.execute('/api/payments/invoices', body);
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
      >
        <div className="flex items-start justify-between">
          <h2 className="section-title">{tr('নতুন ইনভয়েস', 'New Invoice')}</h2>
          <button type="button" aria-label={tr('বন্ধ', 'Close')} className="text-xl" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="iv-stu">{tr('শিক্ষার্থীর আইডি', 'Student ID')} *</label>
            <input id="iv-stu" className="input-field font-mono" placeholder="TLFS-STU-2026-0001" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            {errors.studentId && <p className="error-text">{errors.studentId}</p>}
          </div>
          <div>
            <label className="label" htmlFor="iv-fee">{tr('ফির ধরন', 'Fee type')} *</label>
            <input id="iv-fee" className="input-field" maxLength={60} value={feeType} onChange={(e) => setFeeType(e.target.value)} />
            {errors.feeType && <p className="error-text">{errors.feeType}</p>}
          </div>
          <div>
            <label className="label" htmlFor="iv-amt">{tr('পরিমাণ (৳)', 'Amount (৳)')} *</label>
            <input id="iv-amt" inputMode="decimal" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {errors.amount && <p className="error-text">{errors.amount}</p>}
          </div>
          <div>
            <label className="label" htmlFor="iv-due">{tr('শেষ তারিখ', 'Due date')} *</label>
            <input id="iv-due" type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            {errors.dueDate && <p className="error-text">{errors.dueDate}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="iv-note">{tr('নোট', 'Note')}</label>
            <textarea id="iv-note" rows={2} className="input-field" value={note} onChange={(e) => setNote(e.target.value)} />
            {errors.note && <p className="error-text">{errors.note}</p>}
          </div>
        </div>

        {formError && <p className="error-text">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={onClose}>
            {tr('বাতিল', 'Cancel')}
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('তৈরি করুন', 'Create')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function InvoicesListPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page') || 1) || 1);
  const status = sp.get('status') || '';
  const studentId = sp.get('studentId') || '';
  const [studentInput, setStudentInput] = useState(studentId);

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status) qs.set('status', status);
  if (studentId) qs.set('studentId', studentId);
  const path = `/api/payments/invoices?${qs.toString()}`;

  const { data, isLoading, isWaking, error, execute } = useApiGet<ListResp>(path, [path]);
  const cancel = useApi<unknown>('PATCH');

  const [creating, setCreating] = useState(false);
  const [toCancel, setToCancel] = useState<InvoiceItem | null>(null);
  const [actionError, setActionError] = useState('');

  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusLabel: Record<string, string> = {
    unpaid: tr('অপরিশোধিত', 'Unpaid'),
    partial: tr('আংশিক', 'Partial'),
    paid: tr('পরিশোধিত', 'Paid'),
    cancelled: tr('বাতিল', 'Cancelled'),
  };
  const statusClass: Record<string, string> = {
    unpaid: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-royal/10 text-royal',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-200 text-gray-700',
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next);
  };

  const applyStudent = (ev: FormEvent) => {
    ev.preventDefault();
    setFilter('studentId', studentInput.trim().toUpperCase());
  };

  const money = (n: number) => `৳ ${Number(n || 0).toLocaleString(isBengali ? 'bn-BD' : 'en-US')}`;

  const confirmCancel = async () => {
    if (!toCancel) return;
    setActionError('');
    try {
      await cancel.execute(`/api/payments/invoices/${toCancel.id}/cancel`, {});
      setToCancel(null);
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('বাতিল করা যায়নি', 'Could not cancel'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">{tr('ইনভয়েস ব্যবস্থাপনা', 'Manage Invoices')}</h1>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          + {tr('নতুন ইনভয়েস', 'New Invoice')}
        </button>
      </div>

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['', ...STATUSES].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={`rounded-full border px-3 py-1 text-sm ${status === s ? 'border-royal bg-royal text-white' : 'border-navy/30 text-navy'}`}
            onClick={() => setFilter('status', s)}
          >
            {s ? statusLabel[s] : tr('সব', 'All')}
          </button>
        ))}
      </div>

      <form className="card flex flex-wrap items-end gap-2" onSubmit={applyStudent}>
        <div>
          <label className="label" htmlFor="i-stu">{tr('শিক্ষার্থীর আইডি', 'Student ID')}</label>
          <input id="i-stu" className="input-field font-mono" placeholder="TLFS-STU-2026-0001" value={studentInput} onChange={(e) => setStudentInput(e.target.value)} />
        </div>
        <button type="submit" className="rounded border border-navy/30 px-3 py-2 text-sm">{tr('খুঁজুন', 'Apply')}</button>
        {studentId && (
          <button type="button" className="text-sm text-royal underline" onClick={() => { setStudentInput(''); setFilter('studentId', ''); }}>
            {tr('মুছুন', 'Clear')}
          </button>
        )}
      </form>

      {actionError && <p className="error-text">{actionError}</p>}

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('ইনভয়েস লোড করা যায়নি।', 'Could not load invoices.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink">{tr('কোনো ইনভয়েস নেই।', 'No invoices found.')}</p>
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-navy">
                <th className="py-2 pr-3">{tr('ইনভয়েস', 'Invoice')}</th>
                <th className="py-2 pr-3">{tr('শিক্ষার্থী', 'Student')}</th>
                <th className="py-2 pr-3">{tr('ফির ধরন', 'Fee type')}</th>
                <th className="py-2 pr-3 text-right">{tr('পরিমাণ', 'Amount')}</th>
                <th className="py-2 pr-3 text-right">{tr('পরিশোধিত', 'Paid')}</th>
                <th className="py-2 pr-3">{tr('শেষ তারিখ', 'Due')}</th>
                <th className="py-2 pr-3">{tr('অবস্থা', 'Status')}</th>
                <th className="py-2 text-right">{tr('কাজ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => {
                const canCancel = inv.status !== 'cancelled' && !(Number(inv.paidAmount) > 0);
                return (
                  <tr key={inv.id} className="border-b border-navy/5 align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{inv.id}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{inv.studentId}</td>
                    <td className="py-2 pr-3">
                      {inv.feeType}
                      {inv.note && <div className="text-xs text-ink/60">{inv.note}</div>}
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{money(inv.amount)}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{money(inv.paidAmount)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{inv.dueDate || '—'}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass[inv.status] ?? 'bg-gray-200 text-gray-700'}`}>
                        {statusLabel[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {canCancel ? (
                        <button type="button" className="text-red-600 underline" onClick={() => setToCancel(inv)}>
                          {tr('বাতিল', 'Cancel')}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} className="rounded border border-navy/30 px-3 py-1 disabled:opacity-40" onClick={() => setFilter('page', String(page - 1))}>
            {tr('আগের', 'Prev')}
          </button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} className="rounded border border-navy/30 px-3 py-1 disabled:opacity-40" onClick={() => setFilter('page', String(page + 1))}>
            {tr('পরের', 'Next')}
          </button>
        </div>
      )}

      {creating && (
        <CreateInvoiceModal
          isBengali={isBengali}
          defaultStudentId={studentId}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await execute();
          }}
        />
      )}

      {toCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !cancel.isLoading && setToCancel(null)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">{tr('ইনভয়েস বাতিল করবেন?', 'Cancel this invoice?')}</h2>
            <p className="mt-2 text-sm text-ink">
              {toCancel.feeType} — {money(toCancel.amount)} ({toCancel.studentId})
            </p>
            <p className="mt-1 text-xs text-ink/60">
              {tr('বাতিল করা ইনভয়েস আর পরিশোধ করা যাবে না। এটি ফেরানো যাবে না।', 'A cancelled invoice can no longer be paid. This cannot be undone.')}
            </p>
            {actionError && <p className="error-text mt-2">{actionError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={cancel.isLoading} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={() => setToCancel(null)}>
                {tr('ফিরে যান', 'Back')}
              </button>
              <button type="button" disabled={cancel.isLoading} className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60" onClick={confirmCancel}>
                {cancel.isLoading ? tr('বাতিল হচ্ছে…', 'Cancelling…') : tr('ইনভয়েস বাতিল', 'Cancel invoice')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
              }
