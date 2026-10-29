// src/features/admin/contact/ContactMessagesPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

type ContactStatus = 'new' | 'read' | 'replied' | 'archived';
const STATUSES: ContactStatus[] = ['new', 'read', 'replied', 'archived'];

interface ContactMessage {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
  status: ContactStatus;
  note?: string;
  createdAt?: unknown;
}

interface ListResp {
  items: ContactMessage[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const PAGE_SIZE = 20;

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

export default function ContactMessagesPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const statusLabel: Record<ContactStatus, string> = {
    new: tr('নতুন', 'New'),
    read: tr('পঠিত', 'Read'),
    replied: tr('উত্তর দেওয়া হয়েছে', 'Replied'),
    archived: tr('আর্কাইভ', 'Archived'),
  };
  const statusClass: Record<ContactStatus, string> = {
    new: 'bg-royal/10 text-royal',
    read: 'bg-gray-200 text-gray-700',
    replied: 'bg-green-100 text-green-800',
    archived: 'bg-yellow-100 text-yellow-800',
  };

  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page') || 1) || 1);
  const status = sp.get('status') || '';

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status) qs.set('status', status);
  const path = `/api/contact?${qs.toString()}`;

  const { data, isLoading, isWaking, error, execute } = useApiGet<ListResp>(path, [path]);
  const patch = useApi<unknown>('PATCH');
  const del = useApi<unknown>('DELETE');

  const [openId, setOpenId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<ContactStatus>('read');
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [actionError, setActionError] = useState('');

  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = items.find((m) => m.id === openId) ?? null;

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next);
  };

  const fmt = (v: unknown) => {
    const d = toDate(v);
    return d ? d.toLocaleString(isBengali ? 'bn-BD' : 'en-GB') : '—';
  };

  const openMessage = async (m: ContactMessage) => {
    setOpenId(m.id);
    setDraftStatus(m.status === 'new' ? 'read' : m.status);
    setDraftNote(m.note ?? '');
    setConfirmDel(false);
    setActionError('');
    if (m.status === 'new') {
      try {
        await patch.execute(`/api/contact/${m.id}`, { status: 'read' });
        await execute();
      } catch {
        /* silent: admin can still set the status manually */
      }
    }
  };

  // Close the panel if the selected message disappears from the current page
  useEffect(() => {
    if (openId && !isLoading && data && !selected) setOpenId(null);
  }, [openId, isLoading, data, selected]);

  const save = async () => {
    if (!selected || saving) return;
    if (draftNote.length > 1000) {
      setActionError(tr('নোট সর্বোচ্চ ১০০০ অক্ষর', 'Note must be at most 1000 characters'));
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      await patch.execute(`/api/contact/${selected.id}`, { status: draftStatus, note: draftNote.trim() });
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('সংরক্ষণ করা যায়নি', 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setActionError('');
    try {
      await del.execute(`/api/contact/${selected.id}`);
      setOpenId(null);
      setConfirmDel(false);
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('মুছে ফেলা যায়নি', 'Could not delete'));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="section-title">{tr('যোগাযোগ বার্তা', 'Contact Messages')}</h1>

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
            className={`rounded-full border px-3 py-1 text-sm ${
              status === s ? 'border-royal bg-royal text-white' : 'border-navy/30 text-navy'
            }`}
            onClick={() => setFilter('status', s)}
          >
            {s ? statusLabel[s as ContactStatus] : tr('সব', 'All')}
          </button>
        ))}
      </div>

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('বার্তা লোড করা যায়নি।', 'Could not load messages.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className={`card overflow-x-auto lg:col-span-3 ${selected ? 'hidden lg:block' : ''}`}>
          {isLoading ? (
            <p className="text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-ink">{tr('কোনো বার্তা নেই।', 'No messages found.')}</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`w-full px-2 py-3 text-left hover:bg-surface ${openId === m.id ? 'bg-surface' : ''}`}
                    onClick={() => openMessage(m)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${m.status === 'new' ? 'font-bold' : 'font-medium'} text-ink`}>
                        {m.name}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusClass[m.status] ?? ''}`}>
                        {statusLabel[m.status] ?? m.status}
                      </span>
                    </div>
                    <p className="truncate text-sm text-ink/80">{m.subject || m.message}</p>
                    <p className="text-xs text-ink/50">{fmt(m.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {total > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <button type="button" disabled={page <= 1} className="rounded border border-navy/30 px-3 py-1 disabled:opacity-40" onClick={() => setFilter('page', String(page - 1))}>
                {tr('আগের', 'Prev')}
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} className="rounded border border-navy/30 px-3 py-1 disabled:opacity-40" onClick={() => setFilter('page', String(page + 1))}>
                {tr('পরের', 'Next')}
              </button>
            </div>
          )}
        </div>

        {selected && (
          <div className="card space-y-3 lg:col-span-2">
            <div className="flex items-start justify-between">
              <h2 className="section-title">{selected.subject || tr('বার্তা', 'Message')}</h2>
              <button type="button" aria-label={tr('বন্ধ', 'Close')} className="text-xl" onClick={() => setOpenId(null)}>
                ✕
              </button>
            </div>

            <dl className="space-y-1 text-sm">
              <div className="flex gap-2"><dt className="w-20 text-ink/60">{tr('নাম', 'Name')}</dt><dd className="text-ink">{selected.name}</dd></div>
              <div className="flex gap-2">
                <dt className="w-20 text-ink/60">{tr('ইমেইল', 'Email')}</dt>
                <dd className="break-all text-ink">
                  {selected.email ? <a className="text-royal underline" href={`mailto:${selected.email}`}>{selected.email}</a> : '—'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 text-ink/60">{tr('ফোন', 'Phone')}</dt>
                <dd className="text-ink">
                  {selected.phone ? <a className="text-royal underline" href={`tel:${selected.phone}`}>{selected.phone}</a> : '—'}
                </dd>
              </div>
              <div className="flex gap-2"><dt className="w-20 text-ink/60">{tr('সময়', 'Received')}</dt><dd className="text-ink">{fmt(selected.createdAt)}</dd></div>
            </dl>

            <p className="whitespace-pre-line rounded bg-surface p-3 text-sm text-ink">{selected.message}</p>

            <div>
              <label className="label" htmlFor="c-status">{tr('অবস্থা', 'Status')}</label>
              <select id="c-status" className="input-field" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as ContactStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c-note">{tr('অভ্যন্তরীণ নোট', 'Internal note')}</label>
              <textarea id="c-note" rows={3} className="input-field" value={draftNote} onChange={(e) => setDraftNote(e.target.value)} />
            </div>

            {actionError && <p className="error-text">{actionError}</p>}

            <div className="flex flex-wrap justify-between gap-2">
              {confirmDel ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-600">{tr('নিশ্চিত?', 'Sure?')}</span>
                  <button type="button" disabled={del.isLoading} className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-60" onClick={remove}>
                    {tr('হ্যাঁ, মুছুন', 'Yes, delete')}
                  </button>
                  <button type="button" className="rounded border border-navy/30 px-3 py-1" onClick={() => setConfirmDel(false)}>
                    {tr('না', 'No')}
                  </button>
                </div>
              ) : (
                <button type="button" className="text-sm text-red-600 underline" onClick={() => setConfirmDel(true)}>
                  {tr('মুছুন', 'Delete')}
                </button>
              )}
              <button type="button" disabled={saving} className="btn-primary disabled:opacity-60" onClick={save}>
                {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ', 'Save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
