// src/components/EmptyState.tsx
import { Inbox } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface EmptyStateProps {
  /** Custom icon (default: Inbox) */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Alias of `description` */
  message?: string;
  /** Optional action button */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  message,
  action,
  className = '',
}: EmptyStateProps) {
  const { t } = useLanguage();
  const body = description ?? message;

  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="mb-4 rounded-full bg-surface p-4 text-ink-light">
        {icon || <Inbox size={40} />}
      </div>

      <h3 className="text-lg font-semibold text-navy">{title || t('common.noResults')}</h3>

      {body && <p className="mt-1 max-w-sm text-sm text-ink-light">{body}</p>}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
                   }
