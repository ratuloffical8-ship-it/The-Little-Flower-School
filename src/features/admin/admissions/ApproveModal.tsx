// src/features/admin/admissions/ApproveModal.tsx
import { useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi } from '../../../hooks/useApi';

interface ApproveModalProps {
  application: {
    id: string;
    applicationId: string;
    studentName: string;
    classApplyingFor?: string;
    sessionId: string;
  };
  onClose: () => void;
  onApproved: (studentId: string) => void;
}

interface ApproveResponse {
  success: boolean;
  studentId?: string;
  item?: {
    studentId?: string;
    id?: string;
  };
}

export default function ApproveModal({
  application,
  onClose,
  onApproved,
}: ApproveModalProps) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const approveApi = useApi<ApproveResponse>('POST');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    try {
      const res = await approveApi.execute(
        `/api/admission/${application.id}/approve`,
        { note: note.trim() || undefined },
      );
      const studentId =
        res?.studentId ??
        res?.item?.studentId ??
        res?.item?.id ??
        '';
      if (!studentId) {
        // Fallback: if the backend didn't return a student ID,
        // close the modal and let the caller refresh.
        onApproved('');
        return;
      }
      onApproved(studentId);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : tr('অনুমোদন ব্যর্থ হয়েছে।', 'Approval failed.'),
      );
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={tr('আবেদন অনুমোদন', 'Approve application')}
    >
      <div className="card w-full max-w-md space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">
            {tr('আবেদন অনুমোদন করুন', 'Approve application')}
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
              <dt className="text-ink/60">
                {tr('আবেদন আইডি', 'Application ID')}
              </dt>
              <dd className="font-mono text-xs text-navy">
                {application.applicationId}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">
                {tr('শিক্ষার্থী', 'Student')}
              </dt>
              <dd className="font-medium text-ink">
                {application.studentName}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{tr('শ্রেণি', 'Class')}</dt>
              <dd className="text-ink">
                {application.classApplyingFor ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{tr('সেশন', 'Session')}</dt>
              <dd className="text-ink">{application.sessionId}</dd>
            </div>
          </dl>
        </div>

        <p className="text-sm text-ink/70">
          {tr(
            'অনুমোদন করলে এই আবেদন থেকে একটি নতুন শিক্ষার্থী রেকর্ড তৈরি হবে।',
            'Approving will create a new student record from this application.',
          )}
        </p>

        <div>
          <label className="label" htmlFor="approve-note">
            {tr('নোট (ঐচ্ছিক)', 'Note (optional)')}
          </label>
          <textarea
            id="approve-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="input-field"
            placeholder={tr(
              'অভিভাবককে জানানোর জন্য নোট…',
              'Note for the guardian…',
            )}
          />
        </div>

        {error && (
          <p className="error-text">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={approveApi.isLoading}
            className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            {tr('বাতিল', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={approveApi.isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {approveApi.isLoading
              ? tr('অনুমোদন হচ্ছে…', 'Approving…')
              : tr('অনুমোদন করুন', 'Approve')}
          </button>
        </div>
      </div>
    </div>
  );
}
