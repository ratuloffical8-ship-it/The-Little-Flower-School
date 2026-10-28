// src/components/DataTable.tsx
import { type ReactNode } from 'react';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';

/* ── Types ── */

export interface Column<T> {
  key: string;
  headerBn: string;
  headerEn: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique key extractor for each row */
  rowKey: (row: T) => string;
  /** Is data currently loading? */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Current sort column key */
  sortKey?: string;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Called when a sortable column header is clicked */
  onSort?: (key: string) => void;
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

/* ── Component ── */

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  emptyMessage,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const { isBengali } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-royal" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState description={emptyMessage} />;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-border bg-white shadow-card ${className}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-light ${
                  col.sortable && onSort ? 'cursor-pointer select-none hover:text-navy' : ''
                } ${col.headerClassName || ''}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {isBengali ? col.headerBn : col.headerEn}
                  {col.sortable && onSort && (
                    <ArrowUpDown
                      size={12}
                      className={
                        sortKey === col.key
                          ? 'text-royal'
                          : 'text-ink-light/40'
                      }
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={`transition-colors hover:bg-surface/40 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 text-ink ${col.className || ''}`}
                >
                  {col.render
                    ? col.render(row, index)
                    : (row as Record<string, unknown>)[col.key] as ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
