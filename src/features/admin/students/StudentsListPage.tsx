// src/features/admin/students/StudentsListPage.tsx
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../hooks/useAuth';
import { useApiGet } from '../../../hooks/useApi';
import StudentFormModal from './StudentFormModal';
import ImportStudentsModal from './ImportStudentsModal';

interface StudentListItem {
  id: string;
  studentId: string;
  name: string;
  classId: string;
  sessionId: string;
  roll?: number | string;
  guardian?: {
    name?: string;
    mobile?: string;
  };
  isActive?: boolean;
}

interface StudentsListResponse {
  items: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface ClassOption {
  id: string;
  nameBn: string;
  nameEn: string;
  order?: number;
}

interface ClassesResponse {
  items?: ClassOption[];
}

const PAGE_SIZE = 25;

const ACTIVE_FILTERS: {
  value: '' | 'true' | 'false';
  bn: string;
  en: string;
}[] = [
  { value: '', bn: 'সব', en: 'All' },
  { value: 'true', bn: 'সক্রিয়', en: 'Active' },
  { value: 'false', bn: 'নিষ্ক্রিয়', en: 'Inactive' },
];

// Fallback list used when /api/classes isn't available (seed data IDs).
const FALLBACK_CLASSES: ClassOption[] = [
  { id: 'play', nameBn: 'প্লে', nameEn: 'Play', order: 0 },
  { id: 'nursery', nameBn: 'নার্সারি', nameEn: 'Nursery', order: 1 },
  { id: '1', nameBn: 'প্রথম', nameEn: 'Class 1', order: 2 },
  { id: '2', nameBn: 'দ্বিতীয়', nameEn: 'Class 2', order: 3 },
  { id: '3', nameBn: 'তৃতীয়', nameEn: 'Class 3', order: 4 },
  { id: '4', nameBn: 'চতুর্থ', nameEn: 'Class 4', order: 5 },
  { id: '5', nameBn: 'পঞ্চম', nameEn: 'Class 5', order: 6 },
  { id: '6', nameBn: 'ষষ্ঠ', nameEn: 'Class 6', order: 7 },
  { id: '7', nameBn: 'সপ্তম', nameEn: 'Class 7', order: 8 },
  { id: '8', nameBn: 'অষ্টম', nameEn: 'Class 8', order: 9 },
  { id: '9', nameBn: 'নবম', nameEn: 'Class 9', order: 10 },
  { id: '10', nameBn: 'দশম', nameEn: 'Class 10', order: 11 },
];

export default function StudentsListPage() {
  const { isBengali } = useLanguage();
  const { role } = useAuth();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const canWrite = role === 'super_admin' || role === 'school_admin';

  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') ?? '';
  const isActive = (params.get('isActive') ?? '') as '' | 'true' | 'false';
  const search = params.get('search') ?? '';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [searchDraft, setSearchDraft] = useState(search);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Attempt to load classes; fall back silently if endpoint doesn't exist.
  const classesRes = useApiGet<ClassesResponse | ClassOption[]>(
    '/api/classes',
    [],
  );
  const classes: ClassOption[] = useMemo(() => {
    const d = classesRes.data;
    if (!d) return FALLBACK_CLASSES;
    const arr = Array.isArray(d) ? d : d.items;
    if (!arr || arr.length === 0) return FALLBACK_CLASSES;
    return [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [classesRes.data]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (classId) sp.set('classId', classId);
    if (isActive) sp.set('isActive', isActive);
    if (search) sp.set('search', search);
    sp.set('page', String(page));
    sp.set('pageSize', String(PAGE_SIZE));
    return sp.toString();
  }, [classId, isActive, search, page]);

  const { data, isLoading, isWaking, error, execute } =
    useApiGet<StudentsListResponse>(`/api/students?${queryString}`, [queryString]);

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

  const classLabel = (id: string) => {
    const c = classes.find((x) => x.id === id);
    if (!c) return id;
    return isBengali ? c.nameBn : c.nameEn;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">{tr('শিক্ষার্থী', 'Students')}</h1>
          <p className="text-sm text-ink/70">
            {tr('মোট', 'Total')}: {fmtNum(total)}
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5"
            >
              {tr('ইমপোর্ট', 'Import')}
            </button>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="btn-primary"
            >
              {tr('নতুন শিক্ষার্থী', 'New student')}
            </button>
          </div>
        )}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="filter-class">
              {tr('শ্রেণি', 'Class')}
            </label>
            <select
              id="filter-class"
              value={classId}
              onChange={(e) => updateParam('classId', e.target.value)}
              className="input-field"
            >
              <option value="">{tr('সব শ্রেণি', 'All classes')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {isBengali ? c.nameBn : c.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-active">
              {tr('অবস্থা', 'Status')}
            </label>
            <select
              id="filter-active"
              value={isActive}
              onChange={(e) => updateParam('isActive', e.target.value)}
              className="input-field"
            >
              {ACTIVE_FILTERS.map((f) => (
                <option key={f.value || 'all'} value={f.value}>
                  {tr(f.bn, f.en)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2">
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={tr(
              'শিক্ষার্থী আইডি দিয়ে খুঁজুন…',
              'Search by student ID…',
            )}
            className="input-field flex-1 min-w-[220px]"
          />
          <button type="submit" className="btn-primary">
            {tr('খুঁজুন', 'Search')}
          </button>
          {(classId || isActive || search) && (
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
                  {tr('শিক্ষার্থী আইডি', 'Student ID')}
                </th>
                <th className="px-4 py-3 font-semibold">{tr('নাম', 'Name')}</th>
                <th className="px-4 py-3 font-semibold">
                  {tr('শ্রেণি', 'Class')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr('রোল', 'Roll')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr('অভিভাবক', 'Guardian')}
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
                    {tr('কোনো শিক্ষার্থী নেই।', 'No students found.')}
                  </td>
                </tr>
              )}
              {items.map((it) => {
                const active = it.isActive !== false;
                return (
                  <tr
                    key={it.id}
                    className="border-t border-surface hover:bg-surface/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-navy">
                      {it.studentId}
                    </td>
                    <td className="px-4 py-3">{it.name}</td>
                    <td className="px-4 py-3">{classLabel(it.classId)}</td>
                    <td className="px-4 py-3">{it.roll ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div>{it.guardian?.name ?? '—'}</div>
                      <div className="text-xs text-ink/60">
                        {it.guardian?.mobile ?? ''}
                      </div>
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
                        {active
                          ? tr('সক্রিয়', 'Active')
                          : tr('নিষ্ক্রিয়', 'Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admine/students/${it.id}`}
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

      {showNew && (
        <StudentFormModal
          mode="create"
          classes={classes}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            execute();
          }}
        />
      )}
      {showImport && (
        <ImportStudentsModal
          classes={classes}
          onClose={() => setShowImport(false)}
          onFinished={() => {
            setShowImport(false);
            execute();
          }}
        />
      )}
    </div>
  );
    }
