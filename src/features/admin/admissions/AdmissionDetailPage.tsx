// src/features/admin/admissions/AdmissionDetailPage.tsx
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../hooks/useAuth';
import { useApiGet, useApi } from '../../../hooks/useApi';
import ApproveModal from './ApproveModal';

type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'correction_needed'
  | 'approved'
  | 'rejected'
  | string;

interface StatusEvent {
  status: ApplicationStatus;
  note?: string;
  at?: string | { _seconds: number } | null;
  byUid?: string;
}

interface DocumentRef {
  name?: string;
  path?: string;
  url?: string;
}

interface ApplicationDetail {
  id: string;
  applicationId: string;
  sessionId: string;
  status: ApplicationStatus;
  classApplyingFor?: string;
  student?: {
    nameBn?: string;
    nameEn?: string;
    dob?: string;
    gender?: string;
    bloodGroup?: string;
    religion?: string;
    nationality?: string;
    birthCertificateNo?: string;
    previousSchool?: string;
  };
  guardian?: {
    name?: string;
    relation?: string;
    mobile?: string;
    altMobile?: string;
    nid?: string;
    email?: string;
    occupation?: string;
    address?: string;
  };
  documents?: Record<string, DocumentRef | undefined>;
  statusHistory?: StatusEvent[];
  createdAt?: string | { _seconds: number } | null;
  submittedAt?: string | { _seconds: number } | null;
  correctionNote?: string;
}

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

function toDate(value: ApplicationDetail['createdAt']): Date | null {
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

export default function AdmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isBengali } = useLanguage();
  const { role } = useAuth();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const canReview =
    role === 'super_admin' ||
    role === 'school_admin' ||
    role === 'admission_officer';

  const { data, isLoading, isWaking, error, execute } =
    useApiGet<{ item: ApplicationDetail } | ApplicationDetail>(
      id ? `/api/admission/${id}` : '',
      [id],
    );

  // Response may be { item } or raw object — tolerate both
  const app: ApplicationDetail | null = useMemo(() => {
    if (!data) return null;
    if ('item' in (data as object)) return (data as { item: ApplicationDetail }).item;
    return data as ApplicationDetail;
  }, [data]);

  const statusApi = useApi<{ success: boolean }>('PATCH');

  const [note, setNote] = useState('');
  const [showApprove, setShowApprove] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    execute();
  }, [execute]);

  async function changeStatus(next: ApplicationStatus, needsNote: boolean) {
    if (!app) return;
    if (needsNote && !note.trim()) {
      setActionError(
        tr('নোট আবশ্যক।', 'A note is required.'),
      );
      return;
    }
    setActionError(null);
    try {
      await statusApi.execute(`/api/admission/${app.id}/status`, {
        status: next,
        note: note.trim() || undefined,
      });
      setNote('');
      refresh();
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : tr('কাজটি ব্যর্থ হয়েছে।', 'The action failed.'),
      );
    }
  }

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

  if (isLoading && !app) {
    return (
      <div className="card">
        <p className="text-ink/60">{tr('লোড হচ্ছে…', 'Loading…')}</p>
      </div>
    );
  }

  if (error && !app) {
    return (
      <div className="space-y-4">
        <Link to="/admine/admissions" className="text-sm text-navy underline">
          ← {tr('তালিকায় ফিরে যান', 'Back to list')}
        </Link>
        <div className="card border-l-4 border-l-red-600">
          <p className="text-sm text-red-700">
            {tr(
              'আবেদনটি লোড করা যায়নি।',
              'Could not load the application.',
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

  if (!app) return null;

  const label = STATUS_LABEL[app.status];
  const pill = STATUS_PILL[app.status] ?? 'bg-gray-100 text-gray-800';
  const studentName = isBengali
    ? app.student?.nameBn || app.student?.nameEn || '—'
    : app.student?.nameEn || app.student?.nameBn || '—';

  const documents = Object.entries(app.documents ?? {}).filter(
    ([, v]) => v && (v.url || v.path),
  );

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
            to="/admine/admissions"
            className="text-sm text-navy underline"
          >
            ← {tr('তালিকায় ফিরে যান', 'Back to list')}
          </Link>
          <h1 className="section-title mt-2">{studentName}</h1>
          <p className="font-mono text-xs text-ink/60">{app.applicationId}</p>
        </div>
        <span
          className={
            'inline-block rounded-full px-3 py-1 text-sm font-medium ' + pill
          }
        >
          {label ? tr(label.bn, label.en) : humanize(app.status)}
        </span>
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
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label={tr('নাম (বাংলা)', 'Name (Bengali)')} value={app.student?.nameBn} />
              <Field label={tr('নাম (ইংরেজি)', 'Name (English)')} value={app.student?.nameEn} />
              <Field label={tr('শ্রেণি', 'Class')} value={app.classApplyingFor} />
              <Field label={tr('জন্ম তারিখ', 'Date of birth')} value={app.student?.dob} />
              <Field label={tr('লিঙ্গ', 'Gender')} value={app.student?.gender} />
              <Field label={tr('রক্তের গ্রুপ', 'Blood group')} value={app.student?.bloodGroup} />
              <Field label={tr('ধর্ম', 'Religion')} value={app.student?.religion} />
              <Field label={tr('জাতীয়তা', 'Nationality')} value={app.student?.nationality} />
              <Field
                label={tr('জন্ম সনদ নম্বর', 'Birth certificate no.')}
                value={app.student?.birthCertificateNo}
              />
              <Field
                label={tr('পূর্ববর্তী বিদ্যালয়', 'Previous school')}
                value={app.student?.previousSchool}
              />
            </dl>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold text-navy">
              {tr('অভিভাবকের তথ্য', 'Guardian information')}
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label={tr('নাম', 'Name')} value={app.guardian?.name} />
              <Field label={tr('সম্পর্ক', 'Relation')} value={app.guardian?.relation} />
              <Field label={tr('মোবাইল', 'Mobile')} value={app.guardian?.mobile} />
              <Field label={tr('বিকল্প মোবাইল', 'Alt. mobile')} value={app.guardian?.altMobile} />
              <Field label={tr('এনআইডি', 'NID')} value={app.guardian?.nid} />
              <Field label={tr('ইমেইল', 'Email')} value={app.guardian?.email} />
              <Field label={tr('পেশা', 'Occupation')} value={app.guardian?.occupation} />
              <Field
                label={tr('ঠিকানা', 'Address')}
                value={app.guardian?.address}
                full
              />
            </dl>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold text-navy">
              {tr('ডকুমেন্ট', 'Documents')}
            </h2>
            {documents.length === 0 ? (
              <p className="text-sm text-ink/60">
                {tr('কোনো ডকুমেন্ট নেই।', 'No documents uploaded.')}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.map(([key, doc]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded border border-surface px-3 py-2"
                  >
                    <span className="text-ink">
                      {doc?.name || humanize(key)}
                    </span>
                    {doc?.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-royal hover:underline"
                      >
                        {tr('খুলুন', 'Open')}
                      </a>
                    ) : (
                      <span className="text-xs text-ink/50">
                        {tr('লিঙ্ক নেই', 'No link')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {canReview && app.status !== 'approved' && (
            <div className="card">
              <h2 className="mb-3 font-semibold text-navy">
                {tr('পদক্ষেপ নিন', 'Take action')}
              </h2>
              <label className="label" htmlFor="action-note">
                {tr('নোট (ঐচ্ছিক)', 'Note (optional)')}
              </label>
              <textarea
                id="action-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="input-field"
                placeholder={tr(
                  'আবেদনকারীর জন্য নোট…',
                  'Note for the applicant…',
                )}
              />
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowApprove(true)}
                  disabled={statusApi.isLoading}
                  className="btn-primary"
                >
                  {tr('অনুমোদন করুন', 'Approve')}
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus('under_review', false)}
                  disabled={statusApi.isLoading}
                  className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-50"
                >
                  {tr('পর্যালোচনায় রাখুন', 'Mark under review')}
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus('correction_needed', true)}
                  disabled={statusApi.isLoading}
                  className="rounded border border-amber-500 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  {tr('সংশোধনের জন্য ফেরত', 'Request correction')}
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus('rejected', true)}
                  disabled={statusApi.isLoading}
                  className="rounded border border-red-500 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {tr('প্রত্যাখ্যান করুন', 'Reject')}
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="mb-3 font-semibold text-navy">
              {tr('ইতিহাস', 'History')}
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">{tr('জমা দেওয়া', 'Submitted')}</dt>
                <dd className="text-right text-ink">
                  {fmtDateTime(toDate(app.submittedAt ?? app.createdAt))}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">{tr('সেশন', 'Session')}</dt>
                <dd className="text-right text-ink">{app.sessionId}</dd>
              </div>
            </dl>
            {app.statusHistory && app.statusHistory.length > 0 && (
              <ol className="mt-4 space-y-3 border-t border-surface pt-3">
                {app.statusHistory.map((ev, i) => {
                  const l = STATUS_LABEL[ev.status];
                  return (
                    <li key={i} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-navy">
                          {l ? tr(l.bn, l.en) : humanize(ev.status)}
                        </span>
                        <span className="text-xs text-ink/60">
                          {fmtDateTime(toDate(ev.at))}
                        </span>
                      </div>
                      {ev.note && (
                        <p className="mt-1 text-ink/70">{ev.note}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>

      {showApprove && (
        <ApproveModal
          application={{
            id: app.id,
            applicationId: app.applicationId,
            studentName,
            classApplyingFor: app.classApplyingFor,
            sessionId: app.sessionId,
          }}
          onClose={() => setShowApprove(false)}
          onApproved={(studentId) => {
            setShowApprove(false);
            refresh();
            navigate(`/admine/students/${studentId}`);
          }}
        />
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
