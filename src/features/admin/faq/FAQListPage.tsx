// src/features/admin/faq/FAQListPage.tsx
import { useMemo, useState } from 'react';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';
import FAQFormModal, { type FAQItem } from './FAQFormModal';

export default function FAQListPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  // Tolerant: server may return a raw array or { items }
  const { data, isLoading, isWaking, error, execute } = useApiGet<FAQItem[] | { items: FAQItem[] }>('/api/faq', []);
  const reorder = useApi<unknown>('POST');
  const del = useApi<unknown>('DELETE');

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; faq?: FAQItem } | null>(null);
  const [toDelete, setToDelete] = useState<FAQItem | null>(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const items = useMemo<FAQItem[]>(() => {
    const arr = Array.isArray(data) ? data : data?.items ?? [];
    return [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [data]);

  const nextOrder = items.reduce((m, i) => Math.max(m, i.order ?? 0), 0) + 1;

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length || busy) return;
    const list = [...items];
    [list[index], list[target]] = [list[target], list[index]];
    setBusy(true);
    setActionError('');
    try {
      await reorder.execute('/api/faq/reorder', {
        items: list.map((f, i) => ({ id: f.id, order: i + 1 })),
      });
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('ক্রম বদলানো যায়নি', 'Could not reorder'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setActionError('');
    try {
      await del.execute(`/api/faq/${toDelete.id}`);
      setToDelete(null);
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('মুছে ফেলা যায়নি', 'Could not delete'));
    }
  };

  const q = (f: FAQItem) => (isBengali ? f.questionBn || f.questionEn : f.questionEn || f.questionBn);
  const a = (f: FAQItem) => (isBengali ? f.answerBn || f.answerEn : f.answerEn || f.answerBn);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">{tr('সাধারণ জিজ্ঞাসা (FAQ)', 'FAQ Management')}</h1>
        <button type="button" className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
          + {tr('নতুন প্রশ্ন', 'New FAQ')}
        </button>
      </div>

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}

      {actionError && <p className="error-text">{actionError}</p>}

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('FAQ লোড করা যায়নি।', 'Could not load FAQs.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="card text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</div>
      ) : items.length === 0 ? (
        <div className="card text-sm text-ink">{tr('কোনো FAQ নেই।', 'No FAQs yet.')}</div>
      ) : (
        <ul className="space-y-3">
          {items.map((f, i) => (
            <li key={f.id} className="card flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label={tr('উপরে', 'Move up')}
                  disabled={busy || i === 0}
                  className="rounded border border-navy/30 px-2 text-sm disabled:opacity-30"
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <span className="text-xs text-ink/60">{i + 1}</span>
                <button
                  type="button"
                  aria-label={tr('নিচে', 'Move down')}
                  disabled={busy || i === items.length - 1}
                  className="rounded border border-navy/30 px-2 text-sm disabled:opacity-30"
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{q(f)}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      f.published ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {f.published ? tr('প্রকাশিত', 'Published') : tr('লুকানো', 'Hidden')}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-ink/80">{a(f)}</p>
                <div className="mt-2 flex gap-4 text-sm">
                  <button type="button" className="text-royal underline" onClick={() => setModal({ mode: 'edit', faq: f })}>
                    {tr('সম্পাদনা', 'Edit')}
                  </button>
                  <button type="button" className="text-red-600 underline" onClick={() => setToDelete(f)}>
                    {tr('মুছুন', 'Delete')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <FAQFormModal
          mode={modal.mode}
          faq={modal.faq}
          defaultOrder={nextOrder}
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
            <h2 className="section-title">{tr('প্রশ্নটি মুছবেন?', 'Delete this FAQ?')}</h2>
            <p className="mt-2 text-sm text-ink">{q(toDelete)}</p>
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
