// src/features/admin/users/UsersListPage.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';
import UserFormModal, { ROLES, type UserItem } from './UserFormModal';

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

export default function UsersListPage() {
  const { isBengali } = useLanguage();
  const { user } = useAuth();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const [sp, setSp] = useSearchParams();
  const role = sp.get('role') || '';
  const path = `/api/users${role ? `?role=${encodeURIComponent(role)}` : ''}`;

  // Tolerant: raw array or { items }
  const { data, isLoading, isWaking, error, execute } = useApiGet<UserItem[] | { items: UserItem[] }>(path, [path]);
  const del = useApi<unknown>('DELETE');

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user?: UserItem } | null>(null);
  const [toDelete, setToDelete] = useState<UserItem | null>(null);
  const [actionError, setActionError] = useState('');

  const roleLabel: Record<string, string> = {
    super_admin: tr('সুপার অ্যাডমিন', 'Super admin'),
    school_admin: tr('স্কুল অ্যাডমিন', 'School admin'),
    accountant: tr('হিসাবরক্ষক', 'Accountant'),
    teacher: tr('শিক্ষক', 'Teacher'),
    admission_officer: tr('ভর্তি কর্মকর্তা', 'Admission officer'),
  };

  const all: UserItem[] = Array.isArray(data) ? data : data?.items ?? [];
  const q = search.trim().toLowerCase();
  const items = q
    ? all.filter((u) => `${u.name ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q))
    : all;

  const myEmail = (user?.email ?? '').toLowerCase();
  const isSelf = (u: UserItem) => Boolean(myEmail) && (u.email ?? '').toLowerCase() === myEmail;

  const setRole = (value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set('role', value);
    else next.delete('role');
    setSp(next);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setActionError('');
    try {
      await del.execute(`/api/users/${toDelete.uid}`);
      setToDelete(null);
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('মুছে ফেলা যায়নি', 'Could not delete'));
    }
  };

  const fmt = (v: unknown) => {
    const d = toDate(v);
    return d ? d.toLocaleString(isBengali ? 'bn-BD' : 'en-GB') : '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">{tr('অ্যাডমিন ব্যবহারকারী', 'Admin Users')}</h1>
        <button type="button" className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
          + {tr('নতুন ব্যবহারকারী', 'New User')}
        </button>
      </div>

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="u-role">{tr('ভূমিকা', 'Role')}</label>
          <select id="u-role" className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">{tr('সব', 'All')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel[r]}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="u-search">{tr('খুঁজুন (নাম / ইমেইল)', 'Search (name / email)')}</label>
          <input id="u-search" className="input-field" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {actionError && <p className="error-text">{actionError}</p>}

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('ব্যবহারকারী লোড করা যায়নি।', 'Could not load users.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink">{tr('কোনো ব্যবহারকারী নেই।', 'No users found.')}</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-navy">
                <th className="py-2 pr-3">{tr('নাম', 'Name')}</th>
                <th className="py-2 pr-3">{tr('ইমেইল', 'Email')}</th>
                <th className="py-2 pr-3">{tr('ভূমিকা', 'Role')}</th>
                <th className="py-2 pr-3">{tr('অবস্থা', 'Status')}</th>
                <th className="py-2 pr-3">{tr('সর্বশেষ লগইন', 'Last login')}</th>
                <th className="py-2 text-right">{tr('কাজ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const active = u.isActive !== false;
                const self = isSelf(u);
                return (
                  <tr key={u.uid} className="border-b border-navy/5 align-top">
                    <td className="py-2 pr-3 font-medium text-ink">
                      {u.name || '—'}
                      {self && <span className="ml-2 rounded-full bg-gold/30 px-2 py-0.5 text-xs text-navy">{tr('আপনি', 'You')}</span>}
                    </td>
                    <td className="py-2 pr-3 break-all">{u.email}</td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-royal/10 px-2 py-0.5 text-xs text-royal">{roleLabel[u.role] ?? u.role}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {active ? tr('সক্রিয়', 'Active') : tr('নিষ্ক্রিয়', 'Inactive')}
                      </span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{fmt(u.lastLoginAt)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button type="button" className="mr-3 text-royal underline" onClick={() => setModal({ mode: 'edit', user: u })}>
                        {tr('সম্পাদনা', 'Edit')}
                      </button>
                      {!self && (
                        <button type="button" className="text-red-600 underline" onClick={() => setToDelete(u)}>
                          {tr('মুছুন', 'Delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <UserFormModal
          mode={modal.mode}
          user={modal.user}
          isSelf={modal.user ? isSelf(modal.user) : false}
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
            <h2 className="section-title">{tr('ব্যবহারকারী মুছবেন?', 'Delete this user?')}</h2>
            <p className="mt-2 text-sm text-ink">{toDelete.name} — {toDelete.email}</p>
            <p className="mt-1 text-xs text-ink/60">
              {tr(
                'লগইন অ্যাকাউন্ট ও রেকর্ড স্থায়ীভাবে মুছে যাবে। শুধু লগইন বন্ধ করতে চাইলে সম্পাদনায় “নিষ্ক্রিয়” করুন।',
                'The login account and record are removed permanently. To only block sign-in, set the user to Inactive via Edit instead.',
              )}
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
