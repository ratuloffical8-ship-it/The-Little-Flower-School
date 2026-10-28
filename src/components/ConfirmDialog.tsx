// src/components/ConfirmDialog.tsx
import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels or closes */
  onCancel: () => void;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text (default: localized "Confirm") */
  confirmText?: string;
  /** Cancel button text (default: localized "Cancel") */
  cancelText?: string;
  /** Danger mode — red confirm button */
  danger?: boolean;
  /** Is the confirm action loading? */
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText,
  cancelText,
  danger = false,
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when opened
  useEffect(() => {
    if (isOpen && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-dark/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md animate-fade-in rounded-2xl bg-white p-6 shadow-modal">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-3 top-3 rounded-md p-1 text-ink-light transition-colors hover:bg-surface hover:text-ink"
          aria-label={t('common.close')}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div
          className={`mb-4 inline-flex rounded-full p-3 ${
            danger ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
          }`}
        >
          <AlertTriangle size={24} />
        </div>

        {/* Title */}
        <h2
          id="confirm-dialog-title"
          className="text-lg font-bold text-navy"
        >
          {title}
        </h2>

        {/* Message */}
        <p className="mt-2 text-sm leading-relaxed text-ink-light">
          {message}
        </p>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface"
            disabled={isLoading}
          >
            {cancelText || t('common.cancel')}
          </button>

          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              danger
                ? 'bg-error hover:bg-error/90'
                : 'bg-royal hover:bg-royal/90'
            }`}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('common.loading')}
              </span>
            ) : (
              confirmText || t('common.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );
  }
