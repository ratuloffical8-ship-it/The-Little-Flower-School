// src/features/admin/exams/ResultsPublishModal.tsx
import { useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi } from '../../../hooks/useApi';

interface ExamSummary {
  id: string;
  name: string;
  classId: string;
  sessionId: string;
  published?: boolean;
}

interface ResultsPublishModalProps {
  exam: ExamSummary;
  onClose: () => void;
  onDone: () => void;
}

export default function ResultsPublishModal({ exam, onClose, onDone }: ResultsPublishModalProps) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const api = useApi<{ success: boolean }>('PATCH');
  const [error, setError] = useState<string | null>(null);
  const willPublish = !exam.published;

  async function handleConfirm() {
    setError(null);
    try {
      await api.execute(`/api/exams/${exam.id}/publish`, { published: willPublish });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('কাজটি ব্যর্থ হয়েছে।', 'The action failed.'));
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !api.isLoading) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="card w-full max-w-md space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">
            {willPublish ? tr('ফলাফল প্রকাশ করুন', 'Publish results') : tr('ফলাফল অপ্রকাশ করুন', 'Unpublish results')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/50 hover:text-ink"
            aria-label={tr('বন্ধ করুন', 'Close')}
          >
            ✕
          </button>
        </div>

        <div className="rounded bg-surface p-3 text-sm">
          <dl className="space-y-1">
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{tr('পরীক্ষা', 'Exam')}</dt>
              <dd className="font-medium text-ink">{exam.name}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{tr('শ্রেণি', 'Class')}</dt>
              <dd className="text-ink">{exam.classId}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{tr('সেশন', 'Session')}</dt>
              <dd className="text-ink">{exam.sessionId}</dd>
            </div>
          </dl>
        </div>

        <p className="text-sm text-ink/80">
          {willPublish
            ? tr(
                'প্রকাশ করলে অভিভাবকগণ ফলাফল পাতা থেকে এই পরীক্ষার ফলাফল দেখতে পারবেন। প্রকাশনার জন্য কমপক্ষে ১টি নম্বর এন্ট্রি করা থাকতে হবে।',
                'Publishing lets guardians look up these results from the public page. At least one result entry must exist.',
              )
            : tr(
                'অপ্রকাশ করলে এই পরীক্ষার ফলাফল আর অনলাইনে দেখা যাবে না।',
                'Unpublishing will immediately hide these results from the public page.',
              )}
        </p>

        {error && <p className="error-text">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={api.isLoading}
            className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            {tr('বাতিল', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={api.isLoading}
            className={
              willPublish
                ? 'btn-primary disabled:opacity-50'
                : 'rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'
            }
          >
            {api.isLoading
              ? tr('প্রক্রিয়াধীন…', 'Processing…')
              : willPublish
                ? tr('প্রকাশ করুন', 'Publish')
                : tr('অপ্রকাশ করুন', 'Unpublish')}
          </button>
        </div>
      </div>
    </div>
  );
            }
