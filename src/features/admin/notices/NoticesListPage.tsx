// src/features/admin/notices/NoticesListPage.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';
import NoticeFormModal, { type NoticeItem } from './NoticeFormModal';

interface ListResp {
  items: NoticeItem[];
  total: number;
  page: number;
  pageSize: number;
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

export default function NoticesListPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page') || 1) || 1);
  const published = sp.get('published') || '';
  const important = sp.get('important') || '';

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (published) qs.set('published', published);
  if (important) qs.set('important', important);
  const path = `/api/notices?${qs.toString()}`;

  const { data, isLoading, isWaking, error, execute } = useApiGet<ListResp>(path, [path]);
  const del = useApi<unknown>('DELETE');
  const pdf = useApi<{ url: string }>('GET');

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; notice?: NoticeItem } | null>(null);
  const [toDelete, setToDelete] = useState<NoticeItem | null>(null);
  const [actionError, setActionError] = useState('');

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setActionError('');
    try {
      await del.execute(`/api/notices/${toDelete.id}`);
      setToDelete(null);
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('মুছে ফেলা যায়নি', 'Could not delete'));
    }
  };

  const openPdf = async (id: string) => {
    setActionError('');
    try {
      const res = await pdf.execute(`/api/notices/${id}/download`);
      if (res?.url) window.open(res.url, '_blank', 'noopener');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('PDF খোলা যায়নি', 'Could not open PDF'));
    }
  };

  const fmtDate = (v: unknown) => {
    const d = toDate(v);
    return d ? d.toLocaleDateString(isBengali ? 'bn-BD' : 'en-GB') : '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">{tr('নোটিশ ব্যবস্থাপনা', 'Manage Notices')}</h1>
        <button type="button" className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
          + {tr('নতুন নোটিশ', 'New Notice')}
        </button>
      </div>

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}

      <div className="card flex flex-wrap gap-3">
        <div>
          <label className="label" htmlFor="n-pub">{tr('অবস্থা', 'Status')}</label>
          <select id="n-pub" className="input-field" value={published} onChange={(e) => setFilter('published', e.target.value)}>
            <option value="">{tr('সব', 'All')}</option>
            <option value="true">{tr('প্রকাশিত', 'Published')}</option>
            <option value="false">{tr('খসড়া', 'Draft')}</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="n-imp">{tr('গুরুত্ব', 'Importance')}</label>
          <select id="n-imp" className="input-field" value={important} onChange={(e) => setFilter('important', e.target.value)}>
            <option value="">{tr('সব', 'All')}</option>
            <option value="true">{tr('গুরুত্বপূর্ণ', 'Important')}</option>
            <option value="false">{tr('সাধারণ', 'Normal')}</option>
          </select>
        </div>
      </div>

      {actionError && <p className="error-text">{actionError}</p>}

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('নোটিশ লোড করা যায়নি।', 'Could not load notices.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink">{tr('কোনো নোটিশ নেই।', 'No notices found.')}</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-navy">
                <th className="py-2 pr-3">{tr('শিরোনাম', 'Title')}</th>
                <th className="py-2 pr-3">{tr('তারিখ', 'Date')}</th>
                <th className="py-2 pr-3">{tr('অবস্থা', 'Status')}</th>
                <th className="py-2 pr-3">PDF</th>
                <th className="py-2 text-right">{tr('কাজ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} className="border-b border-navy/5 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-ink">
                      {n.important && <span className="mr-1 text-gold">★</span>}
                      {isBengali ? n.titleBn || n.titleEn : n.titleEn || n.titleBn}
                    </div>
                    <div className="text-xs text-ink/60">{isBengali ? n.titleEn : n.titleBn}</div>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(n.date)}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        n.published ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {n.published ? tr('প্রকাশিত', 'Published') : tr('খসড়া', 'Draft')}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {n.pdfPath ? (
                      <button type="button" className="text-royal underline" onClick={() => openPdf(n.id)}>
                        {tr('দেখুন', 'View')}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button type="button" className="mr-3 text-royal underline" onClick={() => setModal({ mode: 'edit', notice: n })}>
                      {tr('সম্পাদনা', 'Edit')}
                    </button>
                    <button type="button" className="text-red-600 underline" onClick={() => setToDelete(n)}>
                      {tr('মুছুন', 'Delete')}
                    </button>
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
          <span>
            {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} className="rounded border border-navy/30 px-3 py-1 disabled:opacity-40" onClick={() => setFilter('page', String(page + 1))}>
            {tr('পরের', 'Next')}
          </button>
        </div>
      )}

      {modal && (
        <NoticeFormModal
          mode={modal.mode}
          notice={modal.notice}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await execute();
          }}
        />
      )}

      {toDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !del.isLoading && setToDelete(null)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">{tr('নোটিশ মুছবেন?', 'Delete this notice?')}</h2>
            <p className="mt-2 text-sm text-ink">
              {isBengali ? toDelete.titleBn || toDelete.titleEn : toDelete.titleEn || toDelete.titleBn}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              {tr('সংযুক্ত PDF-ও মুছে যাবে। এটি ফেরানো যাবে না।', 'The attached PDF will also be removed. This cannot be undone.')}
            </p>
            {actionError && <p className="error-text mt-2">{actionError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={del.isLoading} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={() => setToDelete(null)}>
                {tr('বাতিল', 'Cancel')}
              </button>
              <button type="button" disabled={del.isLoading} className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60" onClick={confirmDelete}>
                {del.isLoading ? tr('মুছছে…', 'Deleting…') : tr('মুছুন', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
      }
