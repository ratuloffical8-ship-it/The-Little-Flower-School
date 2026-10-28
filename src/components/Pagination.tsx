// src/components/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface PaginationProps {
  /** Whether there is a next page */
  hasMore: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
  /** Called when "Next" is clicked */
  onNext: () => void;
  /** Called when "Previous" is clicked */
  onPrev: () => void;
  /** Is a page currently loading? */
  isLoading?: boolean;
  /** Current page label (e.g., "Page 2") */
  pageLabel?: string;
}

export default function Pagination({
  hasMore,
  hasPrev,
  onNext,
  onPrev,
  isLoading = false,
  pageLabel,
}: PaginationProps) {
  const { t, isBengali } = useLanguage();

  if (!hasMore && !hasPrev) return null;

  return (
    <div className="flex items-center justify-between border-t border-border bg-white px-4 py-3">
      <button
        onClick={onPrev}
        disabled={!hasPrev || isLoading}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} />
        {isBengali ? 'পূর্ববর্তী' : 'Previous'}
      </button>

      {pageLabel && (
        <span className="text-sm text-ink-light">{pageLabel}</span>
      )}

      <button
        onClick={onNext}
        disabled={!hasMore || isLoading}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isBengali ? 'পরবর্তী' : 'Next'}
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
