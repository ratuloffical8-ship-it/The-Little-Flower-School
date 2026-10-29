// src/features/admin/AdminDashboard.tsx

import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useApiGet } from '../../hooks/useApi';
import StatCard from './common/StatCard';
import ChartCard from './common/ChartCard';
import ActionBar, { type ActionItem } from './common/ActionBar';

/** Shape of GET /api/reports/dashboard → { item } (counts only, safe for all roles). */
interface DashboardSummary {
  students: { active: number };
  teachers: { active: number };
  applications: {
    sessionId: string;
    total: number;
    byStatus: Record<string, number>;
    truncated?: boolean;
  };
  payments: { pending: number };
  invoices: { outstanding: number };
  messages: { unread: number };
}

interface DashboardResponse {
  item: DashboardSummary;
}

// Admission statuses are grouped dynamically by the backend; map the known ones to labels
// and fall back to a humanized version of the raw string for anything else.
const STATUS_LABELS: Record<string, { bn: string; en: string }> = {
  submitted: { bn: 'জমা হয়েছে', en: 'Submitted' },
  under_review: { bn: 'যাচাই চলছে', en: 'Under review' },
  correction_needed: { bn: 'সংশোধন প্রয়োজন', en: 'Correction needed' },
  approved: { bn: 'অনুমোদিত', en: 'Approved' },
  rejected: { bn: 'বাতিল', en: 'Rejected' },
};

function humanize(status: string): string {
  const s = status.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdminDashboard() {
  const { user, role } = useAuth();
  const { isBengali } = useLanguage();
  const { data, isLoading, isWaking, error, execute } = useApiGet<DashboardResponse>(
    '/api/reports/dashboard',
    [],
  );

  const summary = data?.item ?? null;

  const can = (...roles: string[]) => !!role && roles.includes(role);

  const fmt = useMemo(() => {
    const locale = isBengali ? 'bn-BD' : 'en-US';
    return (n: number) => n.toLocaleString(locale);
  }, [isBengali]);

  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const statusRows = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.applications.byStatus)
      .map(([status, count]) => {
        const known = STATUS_LABELS[status];
        const label = known ? (isBengali ? known.bn : known.en) : humanize(status);
        return { status, label, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [summary, isBengali]);

  const maxCount = statusRows.reduce((m, r) => Math.max(m, r.count), 0);

  // Quick actions are filtered by role so nobody sees a link they cannot open.
  const actions: ActionItem[] = [
    can('super_admin', 'school_admin', 'admission_officer') && {
      label: tr('ভর্তি আবেদন দেখুন', 'Review applications'),
      to: '/admine/admissions',
      variant: 'primary' as const,
    },
    can('super_admin', 'school_admin', 'teacher') && {
      label: tr('উপস্থিতি নিন', 'Take attendance'),
      to: '/admine/attendance',
    },
    can('super_admin', 'school_admin', 'accountant') && {
      label: tr('পেমেন্ট যাচাই', 'Verify payments'),
      to: '/admine/payments',
    },
    can('super_admin', 'school_admin') && {
      label: tr('নোটিশ প্রকাশ', 'Publish a notice'),
      to: '/admine/notices',
    },
  ].filter(Boolean) as ActionItem[];

  const displayName = user?.displayName || user?.email || '';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="section-title">{tr('ড্যাশবোর্ড', 'Dashboard')}</h1>
        {displayName && (
          <p className="mt-1 text-sm text-ink/70">
            {tr('স্বাগতম, ', 'Welcome, ')}
            {displayName}
          </p>
        )}
      </header>

      {isWaking && (
        <div role="status" className="card border-l-4 border-gold p-4 text-sm text-ink">
          {tr(
            'সার্ভার চালু হচ্ছে, কয়েক সেকেন্ড অপেক্ষা করুন…',
            'The server is waking up. This can take a few seconds…',
          )}
        </div>
      )}

      {error && !isLoading && (
        <div role="alert" className="card border-l-4 border-red-500 p-4">
          <p className="error-text">
            {tr('ড্যাশবোর্ডের তথ্য আনা যায়নি।', 'Could not load dashboard figures.')}
          </p>
          <button type="button" className="btn-primary mt-3" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Try again')}
          </button>
        </div>
      )}

      <section
        aria-label={tr('সারসংক্ষেপ', 'Summary')}
        className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4"
      >
        {can('super_admin', 'school_admin', 'accountant', 'teacher', 'admission_officer') && (
          <StatCard
            label={tr('সক্রিয় শিক্ষার্থী', 'Active students')}
            value={summary ? fmt(summary.students.active) : null}
            isLoading={isLoading}
            to="/admine/students"
            tone="navy"
          />
        )}
        {can('super_admin', 'school_admin', 'teacher') && (
          <StatCard
            label={tr('সক্রিয় শিক্ষক', 'Active teachers')}
            value={summary ? fmt(summary.teachers.active) : null}
            isLoading={isLoading}
            to="/admine/teachers"
            tone="royal"
          />
        )}
        {can('super_admin', 'school_admin', 'admission_officer') && (
          <StatCard
            label={tr('ভর্তি আবেদন', 'Applications')}
            value={summary ? fmt(summary.applications.total) : null}
            hint={
              summary
                ? tr(`সেশন ${summary.applications.sessionId}`, `Session ${summary.applications.sessionId}`)
                : undefined
            }
            isLoading={isLoading}
            to="/admine/admissions"
            tone="gold"
          />
        )}
        {can('super_admin', 'school_admin', 'accountant') && (
          <StatCard
            label={tr('অপেক্ষমাণ পেমেন্ট', 'Pending payments')}
            value={summary ? fmt(summary.payments.pending) : null}
            isLoading={isLoading}
            to="/admine/payments"
            tone={summary && summary.payments.pending > 0 ? 'alert' : 'navy'}
          />
        )}
        {can('super_admin', 'school_admin', 'accountant') && (
          <StatCard
            label={tr('বকেয়া ইনভয়েস', 'Outstanding invoices')}
            value={summary ? fmt(summary.invoices.outstanding) : null}
            isLoading={isLoading}
            to="/admine/invoices"
            tone="navy"
          />
        )}
        {can('super_admin', 'school_admin') && (
          <StatCard
            label={tr('অপঠিত বার্তা', 'Unread messages')}
            value={summary ? fmt(summary.messages.unread) : null}
            isLoading={isLoading}
            to="/admine/contact"
            tone={summary && summary.messages.unread > 0 ? 'alert' : 'navy'}
          />
        )}
      </section>

      {can('super_admin', 'school_admin', 'admission_officer') && (
        <ChartCard
          title={tr('আবেদনের অবস্থা', 'Applications by status')}
          subtitle={
            summary
              ? tr(`সেশন ${summary.applications.sessionId}`, `Session ${summary.applications.sessionId}`)
              : undefined
          }
          isLoading={isLoading}
          isEmpty={!isLoading && !error && statusRows.length === 0}
          emptyText={tr(
            'এই সেশনে এখনো কোনো আবেদন জমা পড়েনি।',
            'No applications have been submitted for this session yet.',
          )}
        >
          <ul className="space-y-3">
            {statusRows.map((row) => (
              <li key={row.status}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink">{row.label}</span>
                  <span className="font-semibold text-navy">{fmt(row.count)}</span>
                </div>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-surface"
                  role="img"
                  aria-label={`${row.label}: ${row.count}`}
                >
                  <div
                    className="h-full rounded-full bg-royal"
                    style={{ width: `${maxCount ? Math.max(4, (row.count / maxCount) * 100) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {summary?.applications.truncated && (
            <p className="mt-3 text-xs text-ink/60">
              {tr(
                'সংখ্যা আংশিক হতে পারে (সীমা ছাড়িয়ে গেছে)।',
                'Counts may be partial (scan limit reached).',
              )}
            </p>
          )}
        </ChartCard>
      )}

      {actions.length > 0 && (
        <ActionBar title={tr('দ্রুত কাজ', 'Quick actions')} actions={actions} />
      )}
    </div>
  );
}
