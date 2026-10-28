// src/types/payment.ts

/* ── Payment Status ── */

export const PAYMENT_STATUS_KEYS = [
  'pending_verification',
  'verified',
  'rejected',
  'refunded',
] as const;

export type PaymentStatusKey = (typeof PAYMENT_STATUS_KEYS)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusKey, { bn: string; en: string }> = {
  pending_verification: { bn: 'যাচাইয়ের অপেক্ষায়', en: 'Pending Verification' },
  verified: { bn: 'যাচাইকৃত', en: 'Verified' },
  rejected: { bn: 'প্রত্যাখ্যাত', en: 'Rejected' },
  refunded: { bn: 'ফেরত/বাতিল', en: 'Refunded/Reversed' },
};

/* ── Payment Provider ── */

export const PAYMENT_PROVIDERS = ['bkash', 'nagad', 'cash', 'bank'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/* ── Fee Structure ── */

export interface FeeStructure {
  id: string;
  sessionId: string;
  classId: string;
  feeType: FeeType;
  amount: number;
  dueDate?: string;
  isRecurring: boolean; // e.g. monthly tuition
  recurrenceMonths?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const FEE_TYPES = [
  'admission_fee',
  'monthly_tuition',
  'exam_fee',
  'other',
] as const;

export type FeeType = (typeof FEE_TYPES)[number];

/* ── Invoice ── */

export interface Invoice {
  id: string;
  studentId: string;
  sessionId: string;
  classId: string;
  feeStructureId: string;
  feeType: FeeType;
  description: string;
  assessedAmount: number;
  approvedDiscount: number;
  discountReason?: string;
  discountApprovedBy?: string;
  approvedWaiver: number;
  waiverReason?: string;
  waiverApprovedBy?: string;
  dueDate: string;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

/* ── Payment ── */

export interface Payment {
  id: string;
  studentId?: string;
  applicationId?: string;
  invoiceId?: string;
  sessionId: string;
  payerMobile: string;
  provider: PaymentProvider;
  transactionId: string;
  amount: number;
  purpose: string;
  screenshotPath?: string;
  status: PaymentStatusKey;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Payment Ledger (append-only) ── */

export interface PaymentLedgerEntry {
  id: string;
  paymentId: string;
  invoiceId?: string;
  studentId: string;
  type: 'payment' | 'discount' | 'waiver' | 'refund' | 'reversal';
  amount: number; // always positive; type indicates direction
  description: string;
  performedBy: string; // admin uid
  createdAt: string;
}

/* ── Outstanding Calculation ── */
// Formula: Outstanding Due = Assessed Fees − Verified Payments − Approved Waivers
// Refunds/reversals go through paymentLedger so a payment is never counted twice.

export interface OutstandingSummary {
  studentId: string;
  sessionId: string;
  totalAssessed: number;
  totalVerifiedPayments: number;
  totalApprovedWaivers: number;
  totalRefunds: number;
  outstandingDue: number;
}

/* ── Payment Submission (public form) ── */

export interface PaymentSubmissionRequest {
  studentIdOrApplicationId: string;
  guardianMobile: string;
  payerMobile: string;
  provider: PaymentProvider;
  transactionId: string;
  amount: number;
  purpose: string;
}

/* ── Expense ── */

export interface Expense {
  id: string;
  sessionId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paidTo: string;
  paymentMethod: string;
  receiptPath?: string;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
}
