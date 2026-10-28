// src/components/LoadingSpinner.tsx
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Show as full-screen overlay */
  fullScreen?: boolean;
  /** Custom size in pixels (default 32) */
  size?: number;
  /** Optional message below the spinner */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

export default function LoadingSpinner({
  fullScreen = false,
  size = 32,
  message,
  className = '',
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2
        size={size}
        className="animate-spin text-royal"
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm text-ink-light">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
      {spinner}
    </div>
  );
      }
