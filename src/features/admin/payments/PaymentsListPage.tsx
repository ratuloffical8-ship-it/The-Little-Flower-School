// src/features/admin/payments/PaymentsListPage.tsx
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

type PaymentStatus = 'pending' | 'verified' | 'rejected';

interface PaymentItem {
  id: string;
  studentId: string;
  invoiceId?: string;
  provider: string;
  trxId: string;
  senderNumber?: string;
  amount: number;
  status: PaymentStatus;
  screenshotUrl?: string;
  reviewNote?: string;
  reviewedAt?: unknown;
  createdAt?: unknown;
}

interface ListResp {
  items: PaymentItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;
const STATUSES: PaymentStatus[] = ['pending', 'verified', 'rejected'];

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const o = v as { _seconds?: number; seconds?: number };
  const s = o._seconds ?? o.seconds;
  return typeof s === 'number' ? new Date(s * 1000) : null;
}

function ReviewModal({
  payment,
  isBengali,
  onClose,
  onDone,
}: {
  payment: PaymentItem;
  isBengali: boolean;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const patch = useApi<unknown>('PATCH');
  const [decision, setDecision] = useState<'verified' | 'rejected'>('verified');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (saving) return;
    if (note.length > 500) {
      setError(tr('নোট সর্বোচ্চ ৫০০ অক্ষর', 'Note must be at most 500 characters'));
      return;
    }
    if (decision === 'rejected' && !note.trim()) {
      setError(tr('বাতিলের কারণ লিখুন', 'Please give a reason for rejecting'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body: { decision: string; note?: string } = { decision };
      if (note.trim()) body.note = note.trim();
      await patch.execute(`/api/payments/${payment.id}/review`, body);
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('সংরক্ষণ করা যায়নি', 'Could not save'));
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
          <h2 className="section-title">{tr('পেমেন্ট যাচাই', 'Review Payment')}</h2>
          <button type="button" aria-label={tr('বন্ধ', 'Close')} className="text-xl" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        <dl className="space-y-1 text-sm">
          <div className="flex gap-2"><dt className="w-28 text-ink/60">{tr('শিক্ষার্থী', 'Student')}</dt><dd className="font-mono text-ink">{payment.studentId}</dd></div>
          <div className="flex gap-2"><dt className="w-28 text-ink/60">{tr('মাধ্যম', 'Provider')}</dt><dd className="uppercase text-ink">{payment.provider}</dd></div>
          <div className="flex gap-2"><dt className="w-28 text-ink/60">TrxID</dt><dd className="font-mono text-ink">{payment.trxId}</dd></div>
          <div className="flex gap-2"><dt className="w-28 text-ink/60">{tr('প্রেরকের নম্বর', 'Sender')}</dt><dd className="text-ink">{payment.senderNumber || '—'}</dd></div>
          <div className="flex gap-2">
            <dt className="w-28 text-ink/60">{tr('পরিমাণ', 'Amount')}</dt>
            <dd className="font-medium text-ink">৳ {Number(payment.amount).toLocaleString(isBengali ? 'bn-BD' : 'en-US')}</dd>
          </div>
          <div className="flex gap-2"><dt className="w-28 text-ink/60">{tr('ইনভয়েস', 'Invoice')}</dt><dd className="font-mono text-ink">{payment.invoiceId || '—'}</dd></div>
        </dl>

        {payment.screenshotUrl && (
          <a href={payment.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img src={payment.screenshotUrl} alt={tr('পেমেন্টের স্ক্রিনশট', 'Payment screenshot')} className="max-h-64 w-full rounded bg-surface object-contain" />
            <span className="text-xs text-royal underline">{tr('বড় করে খুলুন', 'Open full size')}</span>
          </a>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded border px-3 py-2 text-sm ${decision === 'verified' ? 'border-green-600 bg-green-600 text-white' : 'border-navy/30 text-navy'}`}
            onClick={() => setDecision('verified')}
          >
            {tr('যাচাই করুন (গ্রহণ)', 'Verify (accept)')}
          </button>
          <button
            type="button"
            className={`flex-1 rounded border px-3 py-2 text-sm ${decision === 'rejected' ? 'border-red-600 bg-red-600 text-white' : 'border-navy/30 text-navy'}`}
            onClick={() => setDecision('rejected')}
          >
            {tr('বাতিল করুন', 'Reject')}
          </button>
        </div>

        <div>
          <label className="label" htmlFor="pr-note">
            {tr('নোট', 'Note')} {decision === 'rejected' ? '*' : `(${tr('ঐচ্ছিক', 'optional')})`}
          </label>
          <textarea id="pr-note" rows={3} className="input-field" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <p className="text-xs text-ink/60">
          {decision === 'verified'
            ? tr('যাচাই করলে পরিমাণটি সংশ্লিষ্ট ইনভয়েসের পরিশোধিত অংকে যোগ হবে।', 'Verifying adds the amount to the linked invoice as paid.')
            : tr('বাতিল করলে ইনভয়েসে কোনো পরিবর্তন হবে না।', 'Rejecting leaves the invoice unchanged.')}
        </p>

        {error && <p className="error-text">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={onClose}>
            {tr('বাতিল', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className={decision === 'rejected' ? 'rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60' : 'btn-primary disabled:opacity-60'}
          >
            {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : decision === 'rejected' ? tr('বাতিল নিশ্চিত', 'Confirm reject') : tr('যাচাই নিশ্চিত', 'Confirm verify')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PaymentsListPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page') || 1) || 1);
  const status = sp.get('status') || '';
  const provider = sp.get('provider') || '';
  const studentId = sp.get('studentId') || '';
  const [studentInput, setStudentInput] = useState(studentId);

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status) qs.set('status', status);
  if (provider) qs.set('provider', provider);
  if (studentId) qs.set('studentId', studentId);
  const path = `/api/payments?${qs.toString()}`;

  const { data, isLoading, isWaking, error, execute } = useApiGet<ListResp>(path, [path]);
  const [reviewing, setReviewing] = useState<PaymentItem | null>(null);

  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusLabel: Record<string, string> = {
    pending: tr('অপেক্ষমাণ', 'Pending'),
    verified: tr('যাচাইকৃত', 'Verified'),
    rejected: tr('বাতিল', 'Rejected'),
  };
  const statusClass: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-700',
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

  const fmtDate = (v: unknown) => {
    const d = toDate(v);
    return d ? d.toLocaleString(isBengali ? 'bn-BD' : 'en-GB') : '—';
  };

  return (
    <div className="space-y-4">
      <h1 className="section-title">{tr('পেমেন্ট ব্যবস্থাপনা', 'Manage Payments')}</h1>

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

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="p-prov">{tr('মাধ্যম', 'Provider')}</label>
          <select id="p-prov" className="input-field" value={provider} onChange={(e) => setFilter('provider', e.target.value)}>
            <option value="">{tr('সব', 'All')}</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
          </select>
        </div>
        <form className="flex items-end gap-2" onSubmit={applyStudent}>
          <div>
            <label className="label" htmlFor="p-stu">{tr('শিক্ষার্থীর আইডি', 'Student ID')}</label>
            <input id="p-stu" className="input-field font-mono" placeholder="TLFS-STU-2026-0001" value={studentInput} onChange={(e) => setStudentInput(e.target.value)} />
          </div>
          <button type="submit" className="rounded border border-navy/30 px-3 py-2 text-sm">{tr('খুঁজুন', 'Apply')}</button>
          {studentId && (
            <button type="button" className="text-sm text-royal underline" onClick={() => { setStudentInput(''); setFilter('studentId', ''); }}>
              {tr('মুছুন', 'Clear')}
            </button>
          )}
        </form>
      </div>

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('পেমেন্ট লোড করা যায়নি।', 'Could not load payments.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink">{tr('কোনো পেমেন্ট নেই।', 'No payments found.')}</p>
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-navy">
                <th className="py-2 pr-3">{tr('জমার সময়', 'Submitted')}</th>
                <th className="py-2 pr-3">{tr('শিক্ষার্থী', 'Student')}</th>
                <th className="py-2 pr-3">{tr('মাধ্যম / TrxID', 'Provider / TrxID')}</th>
                <th className="py-2 pr-3 text-right">{tr('পরিমাণ', 'Amount')}</th>
                <th className="py-2 pr-3">{tr('ইনভয়েস', 'Invoice')}</th>
                <th className="py-2 pr-3">{tr('অবস্থা', 'Status')}</th>
                <th className="py-2 text-right">{tr('কাজ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-navy/5 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{p.studentId}</td>
                  <td className="py-2 pr-3">
                    <div className="uppercase">{p.provider}</div>
                    <div className="font-mono text-xs text-ink/70">{p.trxId}</div>
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">৳ {Number(p.amount).toLocaleString(isBengali ? 'bn-BD' : 'en-US')}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{p.invoiceId || '—'}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass[p.status] ?? 'bg-gray-200 text-gray-700'}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                    {p.reviewNote && <div className="mt-1 max-w-[180px] text-xs text-ink/60">{p.reviewNote}</div>}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {p.screenshotUrl && (
                      <a href={p.screenshotUrl} target="_blank" rel="noopener noreferrer" className="mr-3 text-royal underline">
                        {tr('স্ক্রিনশট', 'Screenshot')}
                      </a>
                    )}
                    {p.status === 'pending' ? (
                      <button type="button" className="text-royal underline" onClick={() => setReviewing(p)}>
                        {tr('যাচাই', 'Review')}
                      </button>
                    ) : (
                      <span className="text-xs text-ink/50">{fmtDate(p.reviewedAt)}</span>
                    )}
                  </td>
                </tr>
              ))}
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

      {reviewing && (
        <ReviewModal
          payment={reviewing}
          isBengali={isBengali}
          onClose={() => setReviewing(null)}
          onDone={async () => {
            setReviewing(null);
            await execute();
          }}
        />
      )}
    </div>
  );
              }
