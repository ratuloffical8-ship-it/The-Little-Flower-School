// src/features/admin/gallery/GalleryListPage.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';
import GalleryUploadModal, { type GalleryItem } from './GalleryUploadModal';

interface ListResp {
  items: GalleryItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 24;

export default function GalleryListPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page') || 1) || 1);
  const category = sp.get('category') || '';
  const published = sp.get('published') || '';

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (category) qs.set('category', category);
  if (published) qs.set('published', published);
  const path = `/api/gallery?${qs.toString()}`;

  const { data, isLoading, isWaking, error, execute } = useApiGet<ListResp>(path, [path]);
  // Public categories endpoint (published items only) — used as suggestions; silent if it fails
  const cats = useApiGet<{ items?: string[] } | string[]>('/api/gallery/categories', []);
  const del = useApi<unknown>('DELETE');

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; item?: GalleryItem } | null>(null);
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);
  const [actionError, setActionError] = useState('');

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const catList: string[] = (() => {
    const raw = cats.data as unknown;
    const arr = Array.isArray(raw) ? raw : (raw as { items?: unknown[] } | null)?.items;
    const fromApi = (arr ?? []).filter((x): x is string => typeof x === 'string');
    const fromItems = items.map((i) => i.category).filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromItems])).sort();
  })();

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
      await del.execute(`/api/gallery/${toDelete.id}`);
      setToDelete(null);
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('মুছে ফেলা যায়নি', 'Could not delete'));
    }
  };

  const caption = (i: GalleryItem) =>
    (isBengali ? i.captionBn || i.captionEn : i.captionEn || i.captionBn) || '—';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">{tr('গ্যালারি ব্যবস্থাপনা', 'Manage Gallery')}</h1>
        <button type="button" className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
          + {tr('ছবি আপলোড', 'Upload Photo')}
        </button>
      </div>

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}

      <div className="card flex flex-wrap gap-3">
        <div>
          <label className="label" htmlFor="g-cat">{tr('ক্যাটাগরি', 'Category')}</label>
          <select id="g-cat" className="input-field" value={category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">{tr('সব', 'All')}</option>
            {catList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="g-pub">{tr('অবস্থা', 'Status')}</label>
          <select id="g-pub" className="input-field" value={published} onChange={(e) => setFilter('published', e.target.value)}>
            <option value="">{tr('সব', 'All')}</option>
            <option value="true">{tr('প্রকাশিত', 'Published')}</option>
            <option value="false">{tr('লুকানো', 'Hidden')}</option>
          </select>
        </div>
      </div>

      {actionError && <p className="error-text">{actionError}</p>}

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('গ্যালারি লোড করা যায়নি।', 'Could not load gallery.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="card text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</div>
      ) : items.length === 0 ? (
        <div className="card text-sm text-ink">{tr('কোনো ছবি নেই।', 'No photos found.')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((g) => (
            <div key={g.id} className="card flex flex-col overflow-hidden p-0">
              <div className="aspect-[4/3] w-full bg-surface">
                {g.imageUrl ? (
                  <img src={g.imageUrl} alt={caption(g)} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-ink/50">
                    {tr('ছবি নেই', 'No image')}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="line-clamp-2 text-sm font-medium text-ink">{caption(g)}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-royal/10 px-2 py-0.5 text-royal">{g.category || '—'}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      g.published ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {g.published ? tr('প্রকাশিত', 'Published') : tr('লুকানো', 'Hidden')}
                  </span>
                  <span className="text-ink/60">#{g.order ?? 0}</span>
                </div>
                <div className="mt-auto flex justify-end gap-3 text-sm">
                  <button type="button" className="text-royal underline" onClick={() => setModal({ mode: 'edit', item: g })}>
                    {tr('সম্পাদনা', 'Edit')}
                  </button>
                  <button type="button" className="text-red-600 underline" onClick={() => setToDelete(g)}>
                    {tr('মুছুন', 'Delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
        <GalleryUploadModal
          mode={modal.mode}
          item={modal.item}
          categories={catList}
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
            <h2 className="section-title">{tr('ছবি মুছবেন?', 'Delete this photo?')}</h2>
            <p className="mt-2 text-sm text-ink">{caption(toDelete)}</p>
            <p className="mt-1 text-xs text-ink/60">
              {tr('স্টোরেজ থেকেও ছবিটি মুছে যাবে। এটি ফেরানো যাবে না।', 'The image will also be removed from storage. This cannot be undone.')}
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
