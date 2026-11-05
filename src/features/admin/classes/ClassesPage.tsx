// src/features/admin/classes/ClassesPage.tsx
import { Link } from 'react-router-dom';
import { useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

interface ClassItem {
  id: string;
  nameBn: string;
  nameEn: string;
  order: number;
}
interface StudentRow {
  classId?: string;
  isActive?: boolean;
}

/** Classes of the school with the number of active students in each. */
export default function ClassesPage() {
  const { isBengali, locale } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const num = (n: number) => n.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US');

  const classesRes = useApiGet<{ items: ClassItem[] }>('/api/classes', []);
  const studentsRes = useApiGet<{ items: StudentRow[]; total?: number }>(
    '/api/students?isActive=true&page=1&pageSize=500',
    [],
  );

  const classes = classesRes.data?.items ?? [];
  const students = studentsRes.data?.items ?? [];
  const counts: Record<string, number> = {};
  for (const s of students) if (s.classId) counts[s.classId] = (counts[s.classId] ?? 0) + 1;
  const totalActive = studentsRes.data?.total ?? students.length;

  const loading = classesRes.isLoading || studentsRes.isLoading;
  const failed = !!classesRes.error && !loading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title">{tr('শ্রেণি ও শিক্ষার্থী', 'Classes & students')}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {tr(
            'স্কুলে প্লে থেকে পঞ্চম শ্রেণি আছে। প্রতিটি শ্রেণিতে কতজন সক্রিয় শিক্ষার্থী আছে এখানে দেখুন।',
            'The school runs from Play to Class 5. See how many active students each class has.',
          )}
        </p>
      </div>

      {(classesRes.isWaking || studentsRes.isWaking) && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}

      {failed && (
        <div className="card">
          <p className="error-text">{tr('শ্রেণির তালিকা লোড করা যায়নি।', 'Could not load classes.')}</p>
          <button
            type="button"
            className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm"
            onClick={() => {
              classesRes.execute();
              studentsRes.execute();
            }}
          >
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      {loading && <div className="card text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</div>}

      {!loading && !failed && (
        <>
          <div className="card flex items-center justify-between">
            <span className="text-sm text-ink/70">{tr('মোট সক্রিয় শিক্ষার্থী', 'Total active students')}</span>
            <span className="text-2xl font-bold text-navy">{num(totalActive)}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <div key={c.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-navy">{isBengali ? c.nameBn : c.nameEn}</h2>
                  <span className="rounded-full bg-royal/10 px-3 py-1 text-sm font-semibold text-royal">
                    {num(counts[c.id] ?? 0)} {tr('জন', 'students')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Link to={`/admine/students?classId=${encodeURIComponent(c.id)}`} className="btn-outline px-3 py-1.5">
                    {tr('শিক্ষার্থী দেখুন', 'View students')}
                  </Link>
                  <Link to="/admine/attendance" className="btn-outline px-3 py-1.5">
                    {tr('উপস্থিতি', 'Attendance')}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-ink/50">
            {tr(
              'নতুন শিক্ষার্থী যোগ করতে "শিক্ষার্থী" মেনু ব্যবহার করুন। অনুমোদিত ভর্তি আবেদনও এখানে যুক্ত হয়।',
              'Add new students from the "Students" menu. Approved admission applications are added too.',
            )}
          </p>
        </>
      )}
    </div>
  );
    }
