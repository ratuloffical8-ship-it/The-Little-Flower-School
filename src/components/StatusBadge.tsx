// src/components/StatusBadge.tsx
import type { AdmissionStatusKey } from '@/types/admission';
import { ADMISSION_STATUS_LABELS } from '@/types/admission';
import type { PaymentStatusKey } from '@/types/payment';
import { PAYMENT_STATUS_LABELS } from '@/types/payment';
import type { AttendanceStatus } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

/* ── Color map ── */

const STATUS_COLORS: Record<string, string> = {
  // Admission
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  correction_needed: 'bg-orange-50 text-orange-700 border-orange-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',

  // Payment
  pending_verification: 'bg-amber-50 text-amber-700 border-amber-200',
  verified: 'bg-green-50 text-green-700 border-green-200',
  refunded: 'bg-purple-50 text-purple-700 border-purple-200',

  // Attendance
  present: 'bg-green-50 text-green-700 border-green-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  leave: 'bg-blue-50 text-blue-700 border-blue-200',

  // Generic
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-gray-50 text-gray-500 border-gray-200',
  unpaid: 'bg-red-50 text-red-700 border-red-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

/* ── Types ── */

type StatusType = AdmissionStatusKey | PaymentStatusKey | AttendanceStatus | string;

interface StatusBadgeProps {
  status: StatusType;
  /** Override the displayed label */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

/* ── Component ── */

export default function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const { locale } = useLanguage();

  // Resolve label
  let displayLabel = label;
  if (!displayLabel) {
    // Check admission labels
    if (status in ADMISSION_STATUS_LABELS) {
      const admLabel = ADMISSION_STATUS_LABELS[status as AdmissionStatusKey];
      displayLabel = locale === 'bn' ? admLabel.bn : admLabel.en;
    }
    // Check payment labels
    else if (status in PAYMENT_STATUS_LABELS) {
      const payLabel = PAYMENT_STATUS_LABELS[status as PaymentStatusKey];
      displayLabel = locale === 'bn' ? payLabel.bn : payLabel.en;
    }
    // Fallback: capitalize the key
    else {
      displayLabel = status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  const colorClass = STATUS_COLORS[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${colorClass} ${sizeClass}`}
    >
      {displayLabel}
    </span>
  );
}
