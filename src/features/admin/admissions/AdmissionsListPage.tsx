// src/features/admin/admissions/AdmissionsListPage.tsx
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApiGet } from '../../../hooks/useApi';

type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'correction_needed'
  | 'approved'
  | 'rejected';

interface AdmissionListItem {
  id: string;
  applicationId: string;
  sessionId: string;
  status: ApplicationStatus | string;
  classApplyingFor?: string;
  student?: {
    nameBn?: string;
    nameEn?: string;
  };
  guardian?: {
    name?: string;
    mobile?: string;
  };
  createdAt?: string | { _seconds: number } | null;
  submittedAt?: string | { _seconds: number } | null;
}

interface AdmissionsListResponse {
  items: AdmissionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: '' | ApplicationStatus; bn: string; en: string }[] = [
  { value: '', bn: 'সব', en: 'All' },
  { value: 'submitted', bn: 'জমা দেওয়া', en: 'Submitted' },
  { value: 'under_review', bn: 'পর্যালোচনায়', en: 'Under review' },
  { value: 'correction_needed', bn: 'সংশোধন প্রয়োজন', en: 'Correction needed' },
  { value: 'approved', bn: 'অনুমোদিত', en: 'Approved' },
  { value: 'rejected', bn: 'প্রত্যাখ্যাত', en: 'Rejected' },
];

const STATUS_LABEL: Record<string, { bn: string; en: string }> = {
  submitted: { bn: 'জমা দেওয়া', en: 'Submitted' },
  under_review: { bn: 'পর্যালোচনায়', en: 'Under review' },
  correction_needed: { bn: 'সংশোধন প্রয়োজন', en: 'Correction needed' },
  approved: { bn: 'অনুমোদিত', en: 'Approved' },
  rejected: { bn: 'প্রত্যাখ্যাত', en: 'Rejected' },
};

const STATUS_PILL: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-amber-100 text-amber-800',
  correction_needed: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function humanize(s: string): string {
  return s
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function toDate(value: AdmissionListItem['createdAt']): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && '_seconds' in value) {
    return new Date(value._seconds * 1000);
  }
  return null;
}

export default function AdmissionsListPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const search = params.get('search') ?? '';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [searchDraft, setSearchDraft] = useState(search);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (search) sp.set('search', search);
    sp.set('page', String(page));
    sp.set('pageSize', String(PAGE_SIZE));
    return sp.toString();
  }, [status, search, page]);

  const { data, isLoading, isWaking, error, execute } = useApiGet<AdmissionsListResponse>(
    `/api/admission?${queryString}`,
    [queryString],
  );

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setParams(next, { replace: true });
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam('search', searchDraft.trim());
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fmtNum = (n: number) =>
    n.toLocaleString(isBengali ? 'bn-BD' : 'en-US');

  const fmtDate = (d: Date | null) => {
    if (!d) return '—';
    return d.toLocaleDateString(isBengali ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">{tr('ভর্তির আবেদন', 'Admissions')}</h1>
          <p className="text-sm text-ink/70">
            {tr('মোট আবেদন', 'Total applications')}: {fmtNum(total)}
          </p>
        </div>
      </div>

      {isWaking && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50">
          <p className="text-sm text-amber-900">
            {tr(
              'সার্ভার চালু হচ্ছে, দয়া করে অপেক্ষা করুন…',
              'Server is waking up, please wait…',
            )}
          </p>
        </div>
      )}

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = (status || '') === f.value;
            return (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => updateParam('status', f.value)}
                className={
                  'rounded-full px-3 py-1 text-sm transition ' +
                  (active
                    ? 'bg-navy text-white'
                    : 'bg-surface text-ink hover:bg-navy/10')
                }
              >
                {tr(f.bn, f.en)}
              </button>
            );
          })}
        </div>

        <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2">
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={tr(
              'আবেদন আইডি, নাম বা মোবাইল…',
              'Application ID, name or mobile…',
            )}
            className="input-field flex-1 min-w-[220px]"
          />
          <button type="submit" className="btn-primary">
            {tr('খুঁজুন', 'Search')}
          </button>
          {(status || search) && (
            <button
              type="button"
              onClick={() => {
                setSearchDraft('');
                setParams(new URLSearchParams(), { replace: true });
              }}
              className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5"
            >
              {tr('ফিল্টার মুছুন', 'Clear filters')}
            </button>
          )}
        </form>
      </div>

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
                <th className="px-4 py-3 font-semibold">
                  {tr('আবেদন আইডি', 'Application ID')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr('শিক্ষার্থী', 'Student')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr('শ্রেণি', 'Class')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr('অভিভাবক', 'Guardian')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr('তারিখ', 'Date')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr('অবস্থা', 'Status')}
                </th>
                <th className="px-4 py-3 font-semibold text-right">
                  {tr('কাজ', 'Action')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink/60">
                    {tr('লোড হচ্ছে…', 'Loading…')}
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink/60">
                    {tr('কোনো আবেদন নেই।', 'No applications found.')}
                  </td>
                </tr>
              )}
              {items.map((it) => {
                const label = STATUS_LABEL[it.status];
                const pill = STATUS_PILL[it.status] ?? 'bg-gray-100 text-gray-800';
                const date = toDate(it.submittedAt ?? it.createdAt);
                const name = isBengali
                  ? it.student?.nameBn || it.student?.nameEn || '—'
                  : it.student?.nameEn || it.student?.nameBn || '—';
                return (
                  <tr
                    key={it.id}
                    className="border-t border-surface hover:bg-surface/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-navy">
                      {it.applicationId}
                    </td>
                    <td className="px-4 py-3">{name}</td>
                    <td className="px-4 py-3">{it.classApplyingFor ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div>{it.guardian?.name ?? '—'}</div>
                      <div className="text-xs text-ink/60">
                        {it.guardian?.mobile ?? ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink/80">{fmtDate(date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
                          pill
                        }
                      >
                        {label ? tr(label.bn, label.en) : humanize(it.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admine/admissions/${it.id}`}
                        className="text-sm font-medium text-royal hover:underline"
                      >
                        {tr('দেখুন', 'View')}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink/70">
            {tr('পৃষ্ঠা', 'Page')} {fmtNum(page)} / {fmtNum(totalPages)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParam('page', String(page - 1))}
              className="rounded border border-navy/30 px-3 py-1 text-sm text-navy disabled:opacity-40"
            >
              {tr('পূর্ববর্তী', 'Previous')}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => updateParam('page', String(page + 1))}
              className="rounded border border-navy/30 px-3 py-1 text-sm text-navy disabled:opacity-40"
            >
              {tr('পরবর্তী', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
  }
