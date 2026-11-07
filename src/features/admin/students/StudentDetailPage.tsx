// src/features/admin/students/StudentDetailPage.tsx
import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../hooks/useAuth';
import { useApiGet, useApi } from '../../../hooks/useApi';
import StudentFormModal from './StudentFormModal';
import PrintOverlay from '@/components/PrintOverlay';
import AdmissionFormSheet from '@/components/AdmissionFormSheet';
import { buildAdmissionForm, txt } from '@/utils/admissionForm';

interface StudentRecord {
  id: string;
  studentId: string;
  name: string;
  classId: string;
  sessionId: string;
  roll?: number | string;
  guardian?: {
    name?: string;
    mobile?: string;
    relation?: string;
    address?: string;
    nid?: string;
    email?: string;
  };
  isActive?: boolean;
  createdAt?: string | { _seconds: number } | null;
  updatedAt?: string | { _seconds: number } | null;
  // extra fields saved on approval / from the admission application
  [key: string]: unknown;
  application?: Record<string, unknown> | null;
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

const FALLBACK_CLASSES: ClassOption[] = [
  { id: 'play', nameBn: 'প্লে', nameEn: 'Play', order: 0 },
  { id: 'nursery', nameBn: 'নার্সারি', nameEn: 'Nursery', order: 1 },
  { id: '1', nameBn: 'প্রথম', nameEn: 'Class 1', order: 2 },
  { id: '2', nameBn: 'দ্বিতীয়', nameEn: 'Class 2', order: 3 },
  { id: '3', nameBn: 'তৃতীয়', nameEn: 'Class 3', order: 4 },
  { id: '4', nameBn: 'চতুর্থ', nameEn: 'Class 4', order: 5 },
  { id: '5', nameBn: 'পঞ্চম', nameEn: 'Class 5', order: 6 },
];

function toDate(value: StudentRecord['createdAt']): Date | null {
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

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isBengali } = useLanguage();
  const { role } = useAuth();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const canWrite = role === 'super_admin' || role === 'school_admin';

  const { data, isLoading, isWaking, error, execute } =
    useApiGet<{ item: StudentRecord } | StudentRecord>(
      id ? `/api/students/${id}` : '',
      [id],
    );

  const student: StudentRecord | null = useMemo(() => {
    if (!data) return null;
    if ('item' in (data as object)) return (data as { item: StudentRecord }).item;
    return data as StudentRecord;
  }, [data]);

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

  const deactivateApi = useApi<{ success: boolean }>('DELETE');

  const [showEdit, setShowEdit] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const refresh = useCallback(() => {
    execute();
  }, [execute]);

  async function handleDeactivate() {
    if (!student) return;
    setActionError(null);
    try {
      await deactivateApi.execute(`/api/students/${student.id}`);
      setConfirmDeactivate(false);
      refresh();
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : tr('নিষ্ক্রিয় করা যায়নি।', 'Could not deactivate.'),
      );
    }
  }

  const classLabel = (cid: string) => {
    const c = classes.find((x) => x.id === cid);
    if (!c) return cid;
    return isBengali ? c.nameBn : c.nameEn;
  };

  const fmtDateTime = (d: Date | null) => {
    if (!d) return '—';
    return d.toLocaleString(isBengali ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && !student) {
    return (
      <div className="card">
        <p className="text-ink/60">{tr('লোড হচ্ছে…', 'Loading…')}</p>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="space-y-4">
        <Link to="/admine/students" className="text-sm text-navy underline">
          ← {tr('তালিকায় ফিরে যান', 'Back to list')}
        </Link>
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">
            {tr(
              'শিক্ষার্থী লোড করা যায়নি।',
              'Could not load the student.',
            )}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-2 text-sm text-navy underline"
          >
            {tr('পুনরায় চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!student) return null;

  const active = student.isActive !== false;
  const form = buildAdmissionForm(student, student.application ?? null);
  const docBag = (student.application?.documents ?? {}) as Record<string, unknown>;
  const DOC_NAMES: Record<string, [string, string]> = {
    photo: ['পাসপোর্ট সাইজ ছবি', 'Passport photo'],
    birthCertificate: ['জন্ম নিবন্ধন', 'Birth certificate'],
    previousReportCard: ['আগের রিপোর্ট কার্ড', 'Previous report card'],
    guardianNid: ['অভিভাবকের NID', 'Guardian NID'],
  };
  const documents: Array<[string, string]> = Object.entries(docBag)
    .map(([k, v]): [string, string] => [k, typeof v === 'string' ? v : txt((v as { url?: unknown })?.url)])
    .filter(([, u]) => /^https?:\/\//.test(u));
  if (documents.length === 0 && /^https?:\/\//.test(form.photo)) documents.push(['photo', form.photo]);
  const genderLabel = (g: string) =>
    g === 'male' ? tr('ছেলে', 'Male') : g === 'female' ? tr('মেয়ে', 'Female') : g === 'other' ? tr('অন্যান্য', 'Other') : g;

  return (
    <div className="space-y-6">
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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/admine/students"
            className="text-sm text-navy underline"
          >
            ← {tr('তালিকায় ফিরে যান', 'Back to list')}
          </Link>
          <h1 className="section-title mt-2">{student.name}</h1>
          <p className="font-mono text-xs text-ink/60">{student.studentId}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              'inline-block rounded-full px-3 py-1 text-sm font-medium ' +
              (active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-200 text-gray-700')
            }
          >
            {active ? tr('সক্রিয়', 'Active') : tr('নিষ্ক্রিয়', 'Inactive')}
          </span>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
          >
            {tr('ভর্তি ফরম প্রিন্ট / PDF', 'Admission form / PDF')}
          </button>
          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5"
              >
                {tr('সম্পাদনা', 'Edit')}
              </button>
              {active && (
                <button
                  type="button"
                  onClick={() => setConfirmDeactivate(true)}
                  className="rounded border border-red-500 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  {tr('নিষ্ক্রিয় করুন', 'Deactivate')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-3 font-semibold text-navy">
              {tr('শিক্ষার্থীর তথ্য', 'Student information')}
            </h2>
            {form.photo && (
              <a href={form.photo} target="_blank" rel="noreferrer" className="mb-4 inline-block">
                <img
                  src={form.photo}
                  alt=""
                  className="h-32 w-24 rounded border border-surface object-cover"
                />
              </a>
            )}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label={tr('নাম (বাংলা)', 'Name (Bangla)')} value={form.student.nameBn || student.name} />
              <Field label={tr('নাম (ইংরেজি)', 'Name (English)')} value={form.student.nameEn} />
              <Field label={tr('শিক্ষার্থী আইডি', 'Student ID')} value={student.studentId} />
              <Field label={tr('আবেদন নম্বর', 'Application No')} value={form.applicationId} />
              <Field label={tr('শ্রেণি', 'Class')} value={classLabel(student.classId)} />
              <Field label={tr('রোল', 'Roll')} value={student.roll != null ? String(student.roll) : undefined} />
              <Field label={tr('সেশন', 'Session')} value={student.sessionId} />
              <Field label={tr('জন্ম তারিখ', 'Date of birth')} value={form.student.dateOfBirth} />
              <Field label={tr('লিঙ্গ', 'Gender')} value={genderLabel(form.student.gender)} />
              <Field label={tr('ধর্ম', 'Religion')} value={form.student.religion} />
              <Field label={tr('জাতীয়তা', 'Nationality')} value={form.student.nationality} />
              <Field label={tr('রক্তের গ্রুপ', 'Blood group')} value={form.student.bloodGroup} />
              <Field label={tr('আগের স্কুল', 'Previous school')} value={form.student.previousSchool} full />
            </dl>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold text-navy">
              {tr('অভিভাবকের তথ্য', 'Guardian information')}
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label={tr('পিতার নাম', "Father's name")} value={form.guardian.fatherName} />
              <Field label={tr('মাতার নাম', "Mother's name")} value={form.guardian.motherName} />
              <Field label={tr('অভিভাবকের নাম', 'Guardian name')} value={form.guardian.guardianName} />
              <Field label={tr('সম্পর্ক', 'Relation')} value={form.guardian.relationship} />
              <Field label={tr('পেশা', 'Occupation')} value={form.guardian.occupation} />
              <Field label={tr('মোবাইল', 'Mobile')} value={form.guardian.mobile} />
              <Field label={tr('এনআইডি', 'NID')} value={form.guardian.nid} />
              <Field label={tr('ইমেইল', 'Email')} value={form.guardian.email} />
              <Field label={tr('মাসিক আয়', 'Monthly income')} value={form.guardian.monthlyIncome} />
              <Field label={tr('বর্তমান ঠিকানা', 'Present address')} value={form.guardian.presentAddress} full />
              <Field label={tr('স্থায়ী ঠিকানা', 'Permanent address')} value={form.guardian.permanentAddress} full />
            </dl>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold text-navy">{tr('ডকুমেন্ট', 'Documents')}</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-ink/60">{tr('কোনো ডকুমেন্ট নেই।', 'No documents.')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.map(([key, url]) => (
                  <li key={key} className="flex items-center justify-between gap-3 rounded border border-surface px-3 py-2">
                    <span className="flex items-center gap-3 text-ink">
                      <a href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" loading="lazy" className="h-16 w-16 rounded border border-surface object-cover" />
                      </a>
                      {DOC_NAMES[key] ? tr(DOC_NAMES[key][0], DOC_NAMES[key][1]) : key}
                    </span>
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-royal hover:underline">
                      {tr('খুলুন', 'Open')}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 font-semibold text-navy">
              {tr('রেকর্ড', 'Record')}
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">{tr('তৈরি হয়েছে', 'Created')}</dt>
                <dd className="text-right text-ink">
                  {fmtDateTime(toDate(student.createdAt))}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">
                  {tr('আপডেট হয়েছে', 'Updated')}
                </dt>
                <dd className="text-right text-ink">
                  {fmtDateTime(toDate(student.updatedAt))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold text-navy">
              {tr('দ্রুত লিংক', 'Quick links')}
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to={`/admine/attendance?studentId=${encodeURIComponent(student.studentId)}`}
                  className="text-royal hover:underline"
                >
                  {tr('উপস্থিতি দেখুন', 'View attendance')}
                </Link>
              </li>
              <li>
                <Link
                  to={`/admine/invoices?studentId=${encodeURIComponent(student.studentId)}`}
                  className="text-royal hover:underline"
                >
                  {tr('ইনভয়েস দেখুন', 'View invoices')}
                </Link>
              </li>
              <li>
                <Link
                  to={`/admine/payments?studentId=${encodeURIComponent(student.studentId)}`}
                  className="text-royal hover:underline"
                >
                  {tr('পেমেন্ট দেখুন', 'View payments')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showEdit && (
        <StudentFormModal
          mode="edit"
          classes={classes}
          student={student}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            refresh();
          }}
        />
      )}

      {showForm && (
        <PrintOverlay onClose={() => setShowForm(false)}>
          <AdmissionFormSheet data={form} />
        </PrintOverlay>
      )}

      {confirmDeactivate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDeactivate(false);
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
                'এই শিক্ষার্থীকে নিষ্ক্রিয় করতে চান? পরবর্তীতে আবার সক্রিয় করা যাবে।',
                'Deactivate this student? They can be reactivated later.',
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeactivate(false)}
                disabled={deactivateApi.isLoading}
                className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-50"
              >
                {tr('বাতিল', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivateApi.isLoading}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deactivateApi.isLoading
                  ? tr('প্রক্রিয়াধীন…', 'Processing…')
                  : tr('নিষ্ক্রিয় করুন', 'Deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-ink/60">{label}</dt>
      <dd className="mt-0.5 text-ink">{value || '—'}</dd>
    </div>
  );
      }
