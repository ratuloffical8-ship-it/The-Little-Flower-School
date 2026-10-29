// src/features/admin/common/ChartCard.tsx

import type { ReactNode } from 'react';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  /** Show the empty message instead of children. */
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}

export default function ChartCard({
  title,
  subtitle,
  isLoading = false,
  isEmpty = false,
  emptyText,
  children,
}: ChartCardProps) {
  return (
    <section className="card p-4 sm:p-5" aria-busy={isLoading}>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink/60">{subtitle}</p>}
      </header>

      {isLoading ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface" />
              <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-surface" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <p className="py-6 text-center text-sm text-ink/60">{emptyText}</p>
      ) : (
        children
      )}
    </section>
  );
        }
