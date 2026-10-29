// src/features/admin/common/StatCard.tsx

import { Link } from 'react-router-dom';

export type StatTone = 'navy' | 'royal' | 'gold' | 'alert';

export interface StatCardProps {
  label: string;
  /** Already-formatted value (e.g. Bengali numerals). null shows an em dash. */
  value: string | null;
  /** Small supporting line under the value. */
  hint?: string;
  /** When set, the whole card links to this admin route. */
  to?: string;
  tone?: StatTone;
  isLoading?: boolean;
}

const TONE_BORDER: Record<StatTone, string> = {
  navy: 'border-l-navy',
  royal: 'border-l-royal',
  gold: 'border-l-gold',
  alert: 'border-l-red-600',
};

const TONE_VALUE: Record<StatTone, string> = {
  navy: 'text-navy',
  royal: 'text-royal',
  gold: 'text-navy',
  alert: 'text-red-700',
};

export default function StatCard({
  label,
  value,
  hint,
  to,
  tone = 'navy',
  isLoading = false,
}: StatCardProps) {
  const body = (
    <>
      <p className="text-sm text-ink/70">{label}</p>
      {isLoading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-surface" aria-hidden="true" />
      ) : (
        <p className={`mt-1 text-3xl font-bold ${TONE_VALUE[tone]}`}>{value ?? '—'}</p>
      )}
      {hint && !isLoading && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </>
  );

  const base = `card block border-l-4 p-4 ${TONE_BORDER[tone]}`;

  if (to) {
    return (
      <Link
        to={to}
        aria-busy={isLoading}
        className={`${base} transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-royal`}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={base} aria-busy={isLoading}>
      {body}
    </div>
  );
  }
