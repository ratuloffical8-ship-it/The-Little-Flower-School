// src/features/admin/exams/ExamsListPage.tsx
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../hooks/useAuth';
import { useApi, useApiGet } from '../../../hooks/useApi';
import ExamFormModal from './ExamFormModal';
import ResultsPublishModal from './ResultsPublishModal';

interface ClassOption {
  id: string;
  nameBn: string;
  nameEn: string;
  order?: number;
}

interface ClassesResponse {
  items?: ClassOption[];
}

interface ExamSubject {
  name: string;
  fullMarks: number;
  passMarks?: number;
  isOptional?: boolean;
}

interface ExamRecord {
  id: string;
  name: string;
  classId: string;
  sessionId: string;
  subjects: ExamSubject[];
  published?: boolean;
  publishedAt?: string | { _seconds: number } | null;
  createdAt?: string | { _seconds: number } | null;
}

interface ExamsListResponse {
  items: ExamRecord[];
}

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

export default function ExamsListPage() {
  const { isBengali } = useLanguage();
  const { role } = useAuth();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const canWrite = role === 'super_admin' || role === 'school_admin';

  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') ?? '';
  const publishedFilter = (params.get('published') ?? '') as '' | 'true' | 'false';

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<ExamRecord | null>(null);
  const [publishing, setPublishing] = useState<ExamRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ExamRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const classesRes = useApiGet<ClassesResponse | ClassOption[]>('/api/classes', []);
  const classes: ClassOption[] = useMemo(() => {
    const d = classesRes.data;
    if (!d) return FALLBACK_CLASSES;
    const arr = Array.isArray(d) ? d : d.items;
    if (!arr || arr.length === 0) return FALLBACK_CLASSES;
    return [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [classesRes.data]);

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (classId) sp.set('classId', classId);
    if (publishedFilter) sp.set('published', publishedFilter);
    return sp.toString();
  }, [classId, publishedFilter]);

  const { data, isLoading, isWaking, error, execute } = useApiGet<ExamsListResponse>(
    qs ? `/api/exams?${qs}` : '/api/exams',
    [qs],
  );

  const deleteApi = useApi<{ success: boolean }>('DELETE');

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionError(null);
    try {
      await deleteApi.execute(`/api/exams/${confirmDelete.id}`);
      setConfirmDelete(null);
      execute();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : tr('মুছে ফেলা যায়নি।', 'Could not delete.'),
      );
    }
  }

  const classLabel = (cid: string) => {
    const c = classes.find((x) => x.id === cid);
    if (!c) return cid;
    return isBengali ? c.nameBn : c.nameEn;
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">{tr('পরীক্ষা ও ফলাফল', 'Exams & results')}</h1>
          <p className="text-sm text-ink/70">
            {tr('মোট পরীক্ষা', 'Total exams')}:{' '}
            {items.length.toLocaleString(isBengali ? 'bn-BD' : 'en-US')}
          </p>
        </div>
        {canWrite && (
          <button type="button" onClick={() => setShowNew(true)} className="btn-primary">
            {tr('নতুন পরীক্ষা', 'New exam')}
          </button>
        )}
      </div>

      {isWaking && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50">
          <p className="text-sm text-amber-900">
            {tr('সার্ভার চালু হচ্ছে…', 'Server is waking up…')}
          </p>
        </div>
      )}

      <div className="card grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ex-class">{tr('শ্রেণি', 'Class')}</label>
          <select
            id="ex-class"
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
          <label className="label" htmlFor="ex-published">{tr('প্রকাশনার অবস্থা', 'Publication')}</label>
          <select
            id="ex-published"
            value={publishedFilter}
            onChange={(e) => updateParam('published', e.target.value)}
            className="input-field"
          >
            <option value="">{tr('সব', 'All')}</option>
            <option value="true">{tr('প্রকাশিত', 'Published')}</option>
            <option value="false">{tr('খসড়া', 'Draft')}</option>
          </select>
        </div>
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
          <button type="button" onClick={() => execute()} className="mt-2 text-sm text-navy underline">
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
                <th className="px-4 py-3 font-semibold">{tr('শ্রেণি', 'Class')}</th>
                <th className="px-4 py-3 font-semibold">{tr('সেশন', 'Session')}</th>
                <th className="px-4 py-3 font-semibold">{tr('বিষয়', 'Subjects')}</th>
                <th className="px-4 py-3 font-semibold">{tr('অবস্থা', 'Status')}</th>
                <th className="px-4 py-3 font-semibold text-right">{tr('কাজ', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink/60">
                    {tr('লোড হচ্ছে…', 'Loading…')}
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink/60">
                    {tr('কোনো পরীক্ষা নেই।', 'No exams found.')}
                  </td>
                </tr>
              )}
              {items.map((ex) => (
                <tr key={ex.id} className="border-t border-surface hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium text-ink">{ex.name}</td>
                  <td className="px-4 py-3">{classLabel(ex.classId)}</td>
                  <td className="px-4 py-3">{ex.sessionId}</td>
                  <td className="px-4 py-3">
                    {ex.subjects.length.toLocaleString(isBengali ? 'bn-BD' : 'en-US')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
                        (ex.published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700')
                      }
                    >
                      {ex.published ? tr('প্রকাশিত', 'Published') : tr('খসড়া', 'Draft')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-3">
                      <Link
                        to={`/admine/exams/${ex.id}/results`}
                        className="text-sm font-medium text-royal hover:underline"
                      >
                        {tr('নম্বর', 'Marks')}
                      </Link>
                      {canWrite && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(ex)}
                            className="text-sm font-medium text-navy hover:underline"
                          >
                            {tr('সম্পাদনা', 'Edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPublishing(ex)}
                            className="text-sm font-medium text-navy hover:underline"
                          >
                            {ex.published ? tr('অপ্রকাশ', 'Unpublish') : tr('প্রকাশ', 'Publish')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(ex)}
                            className="text-sm font-medium text-red-700 hover:underline"
                          >
                            {tr('মুছুন', 'Delete')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <ExamFormModal
          mode="create"
          classes={classes}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            execute();
          }}
        />
      )}
      {editing && (
        <ExamFormModal
          mode="edit"
          classes={classes}
          exam={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            execute();
          }}
        />
      )}
      {publishing && (
        <ResultsPublishModal
          exam={publishing}
          onClose={() => setPublishing(null)}
          onDone={() => {
            setPublishing(null);
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
            <h2 className="text-lg font-semibold text-navy">{tr('নিশ্চিত করুন', 'Confirm')}</h2>
            <p className="text-sm text-ink/80">
              {tr(
                `"${confirmDelete.name}" পরীক্ষাটি মুছে ফেলতে চান? কোনো ফলাফল থাকলে এটি মুছবে না।`,
                `Delete the exam "${confirmDelete.name}"? It cannot be deleted if any results exist.`,
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
