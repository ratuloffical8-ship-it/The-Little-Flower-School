// src/features/admin/teachers/TeachersListPage.tsx
import { useMemo, useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../hooks/useAuth';
import { useApiGet, useApi } from '../../../hooks/useApi';
import TeacherFormModal from './TeacherFormModal';

interface TeacherRecord {
  id: string;
  name: string;
  designation?: string;
  subject?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: string | { _seconds: number } | null;
}

interface TeachersListResponse {
  items: TeacherRecord[];
}

export default function TeachersListPage() {
  const { isBengali } = useLanguage();
  const { role } = useAuth();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const canWrite = role === 'super_admin' || role === 'school_admin';

  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<TeacherRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TeacherRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (activeFilter) sp.set('isActive', activeFilter);
    return sp.toString();
  }, [activeFilter]);

  const { data, isLoading, isWaking, error, execute } = useApiGet<TeachersListResponse>(
    queryString ? `/api/teachers?${queryString}` : '/api/teachers',
    [queryString],
  );

  const deleteApi = useApi<{ success: boolean }>('DELETE');

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) =>
      [t.name, t.designation, t.subject, t.phone, t.email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [items, search]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionError(null);
    try {
      await deleteApi.execute(`/api/teachers/${confirmDelete.id}`);
      setConfirmDelete(null);
      execute();
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : tr('মুছে ফেলা যায়নি।', 'Could not delete.'),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">{tr('শিক্ষক-শিক্ষিকা', 'Teachers')}</h1>
          <p className="text-sm text-ink/70">
            {tr('মোট', 'Total')}:{' '}
            {items.length.toLocaleString(isBengali ? 'bn-BD' : 'en-US')}
          </p>
        </div>
        {canWrite && (
          <button type="button" onClick={() => setShowNew(true)} className="btn-primary">
            {tr('নতুন শিক্ষক', 'New teacher')}
          </button>
        )}
      </div>

      {isWaking && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50">
          <p className="text-sm text-amber-900">
            {tr('সার্ভার চালু হচ্ছে, দয়া করে অপেক্ষা করুন…', 'Server is waking up, please wait…')}
          </p>
        </div>
      )}

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', bn: 'সব', en: 'All' },
            { value: 'true', bn: 'সক্রিয়', en: 'Active' },
            { value: 'false', bn: 'নিষ্ক্রিয়', en: 'Inactive' },
          ].map((f) => {
            const active = activeFilter === (f.value as typeof activeFilter);
            return (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => setActiveFilter(f.value as typeof activeFilter)}
                className={
                  'rounded-full px-3 py-1 text-sm transition ' +
                  (active ? 'bg-navy text-white' : 'bg-surface text-ink hover:bg-navy/10')
                }
              >
                {tr(f.bn, f.en)}
              </button>
            );
          })}
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr('নাম, পদবি বা বিষয় দিয়ে খুঁজুন…', 'Search by name, designation or subject…')}
          className="input-field"
        />
      </div>

      {actionError && (
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {error && (
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">
            {tr('তালিকা লোড করা যায়নি।', 'Could not load the list.')}
          </p>
          <button
            type="button"
            onClick={() => execute()}
            className="mt-2 text-sm text-navy underline"
          >
            {tr('পুনরায় চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface text-left text-ink">
              <tr>
                <th className="px-4 py-3 font-semibold">{tr('নাম', 'Name')}</th>
                <th className="px-4 py-3 font-semibold">{tr('পদবি', 'Designation')}</th>
                <th className="px-4 py-3 font-semibold">{tr('বিষয়', 'Subject')}</th>
                <th className="px-4 py-3 font-semibold">{tr('যোগাযোগ', 'Contact')}</th>
                <th className="px-4 py-3 font-semibold">{tr('অবস্থা', 'Status')}</th>
                {canWrite && <th className="px-4 py-3 font-semibold text-right">{tr('কাজ', 'Action')}</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="px-4 py-10 text-center text-ink/60">
                    {tr('লোড হচ্ছে…', 'Loading…')}
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="px-4 py-10 text-center text-ink/60">
                    {tr('কোনো শিক্ষক নেই।', 'No teachers found.')}
                  </td>
                </tr>
              )}
              {filtered.map((t) => {
                const active = t.isActive !== false;
                return (
                  <tr key={t.id} className="border-t border-surface hover:bg-surface/50">
                    <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                    <td className="px-4 py-3">{t.designation ?? '—'}</td>
                    <td className="px-4 py-3">{t.subject ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div>{t.phone ?? '—'}</div>
                      <div className="text-xs text-ink/60">{t.email ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
                          (active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-700')
                        }
                      >
                        {active ? tr('সক্রিয়', 'Active') : tr('নিষ্ক্রিয়', 'Inactive')}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditing(t)}
                            className="text-sm font-medium text-royal hover:underline"
                          >
                            {tr('সম্পাদনা', 'Edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(t)}
                            className="text-sm font-medium text-red-700 hover:underline"
                          >
                            {tr('মুছুন', 'Delete')}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <TeacherFormModal
          mode="create"
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            execute();
          }}
        />
      )}
      {editing && (
        <TeacherFormModal
          mode="edit"
          teacher={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            execute();
          }}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteApi.isLoading) setConfirmDelete(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-navy">
              {tr('নিশ্চিত করুন', 'Confirm')}
            </h2>
            <p className="text-sm text-ink/80">
              {tr(
                `"${confirmDelete.name}" কে স্থায়ীভাবে মুছে ফেলতে চান?`,
                `Permanently delete "${confirmDelete.name}"?`,
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteApi.isLoading}
                className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-50"
              >
                {tr('বাতিল', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteApi.isLoading}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteApi.isLoading ? tr('মুছে ফেলা হচ্ছে…', 'Deleting…') : tr('মুছুন', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
    }
