// server/src/services/payment.service.ts
import { randomUUID } from 'crypto';
import { db, FieldValue, Timestamp } from '../config/firebase';
import { generateId } from './counter.service';
import { uploadFile, getSignedUrl } from './storage.service';
import { findStudentByStudentId } from './student.service';
import { INVOICES_COLLECTION, computeInvoiceStatus, getInvoiceById } from './invoice.service';
import { badRequest, notFound } from '../utils/errors';

const COL = 'payments';

export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type PaymentProvider = 'bkash' | 'nagad';

export interface PaymentRecord {
  id: string;
  studentId: string;
  invoiceId?: string;
  provider: PaymentProvider;
  trxId: string;
  senderNumber: string;
  amount: number;
  status: PaymentStatus;
  screenshotPath?: string;
  screenshotUrl?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmitPaymentInput {
  studentId: string;
  mobile: string;
  provider: PaymentProvider;
  trxId: string;
  senderNumber: string;
  amount: number;
  invoiceId?: string;
}

export interface PaymentFile {
  buffer: Buffer;
  mimetype: string;
}

export interface ListPaymentsParams {
  status?: PaymentStatus;
  provider?: PaymentProvider;
  studentId?: string;
  page: number;
  pageSize: number;
}

const GENERIC_MISMATCH = 'তথ্য মেলেনি / Details do not match';
const DUPLICATE_TRX = 'এই ট্রানজেকশন আইডি ইতিমধ্যে জমা হয়েছে / Transaction ID already submitted';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const iso = (v: unknown): string | undefined =>
  v instanceof Timestamp ? v.toDate().toISOString() : (v as string | undefined);

function normalizeMobile(value: string | undefined): string {
  let d = (value ?? '').replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('88')) d = d.slice(2);
  return d;
}

function toRecord(doc: FirebaseFirestore.DocumentSnapshot): PaymentRecord {
  const data = doc.data() ?? {};
  return {
    ...data,
    id: doc.id,
    reviewedAt: iso(data.reviewedAt),
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  } as PaymentRecord;
}

async function withScreenshotUrl(p: PaymentRecord): Promise<PaymentRecord> {
  if (!p.screenshotPath) return p;
  try {
    const url = await getSignedUrl(p.screenshotPath, 60);
    return { ...p, screenshotUrl: String(url) };
  } catch {
    return p;
  }
}

/** Public submission. Multi-factor: studentId + guardian mobile. Generic errors on mismatch. */
export async function submitPayment(input: SubmitPaymentInput, file?: PaymentFile): Promise<string> {
  const student = await findStudentByStudentId(input.studentId);
  if (
    !student ||
    !student.isActive ||
    !normalizeMobile(student.guardian?.mobile) ||
    normalizeMobile(student.guardian?.mobile) !== normalizeMobile(input.mobile)
  ) {
    throw notFound(GENERIC_MISMATCH);
  }

  if (input.invoiceId) {
    const invoice = await getInvoiceById(input.invoiceId);
    if (!invoice || invoice.studentId !== student.studentId) throw notFound(GENERIC_MISMATCH);
    if (invoice.status !== 'unpaid' && invoice.status !== 'partial') {
      throw badRequest('Invoice is not payable');
    }
  }

  const dup = await db
    .collection(COL)
    .where('provider', '==', input.provider)
    .where('trxId', '==', input.trxId)
    .limit(1)
    .get();
  if (!dup.empty) throw badRequest(DUPLICATE_TRX);

  const id = String(await generateId('payment'));

  let screenshotPath: string | undefined;
  if (file) {
    const ext = EXT_BY_MIME[file.mimetype] ?? 'bin';
    screenshotPath = `payments/${id}/${randomUUID()}.${ext}`;
    await uploadFile(screenshotPath, file.buffer, file.mimetype);
  }

  await db
    .collection(COL)
    .doc(id)
    .set({
      studentId: student.studentId,
      ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
      provider: input.provider,
      trxId: input.trxId,
      senderNumber: input.senderNumber,
      amount: input.amount,
      status: 'pending',
      ...(screenshotPath ? { screenshotPath } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return id;
}

export async function listPayments(
  params: ListPaymentsParams
): Promise<{ items: PaymentRecord[]; total: number; page: number; pageSize: number }> {
  const { status, provider, studentId, page, pageSize } = params;

  let q: FirebaseFirestore.Query = db.collection(COL);
  if (status) q = q.where('status', '==', status);
  if (provider) q = q.where('provider', '==', provider);
  if (studentId) q = q.where('studentId', '==', studentId);
  q = q.orderBy('createdAt', 'desc');

  const total = (await q.count().get()).data().count;
  const snap = await q.offset((page - 1) * pageSize).limit(pageSize).get();
  const items = await Promise.all(snap.docs.map((d) => withScreenshotUrl(toRecord(d))));

  return { items, total, page, pageSize };
}

export async function getPaymentById(id: string): Promise<PaymentRecord | null> {
  const doc = await db.collection(COL).doc(id).get();
  return doc.exists ? withScreenshotUrl(toRecord(doc)) : null;
}

/** Verify or reject a pending payment. Verification updates the linked invoice atomically. */
export async function reviewPayment(
  id: string,
  decision: 'verified' | 'rejected',
  note: string | undefined,
  actorUid: string
): Promise<PaymentRecord> {
  const paymentRef = db.collection(COL).doc(id);

  await db.runTransaction(async (tx) => {
    const pSnap = await tx.get(paymentRef);
    if (!pSnap.exists) throw notFound('Payment not found');
    const p = pSnap.data() as Record<string, unknown>;
    if (p.status !== 'pending') throw badRequest('Payment already reviewed');

    let invoiceRef: FirebaseFirestore.DocumentReference | undefined;
    let invoiceData: Record<string, unknown> | undefined;

    if (decision === 'verified' && p.invoiceId) {
      invoiceRef = db.collection(INVOICES_COLLECTION).doc(String(p.invoiceId));
      const iSnap = await tx.get(invoiceRef);
      if (!iSnap.exists) throw badRequest('Linked invoice not found');
      invoiceData = iSnap.data() as Record<string, unknown>;
      if (invoiceData.status === 'cancelled') throw badRequest('Linked invoice is cancelled');
    }

    tx.update(paymentRef, {
      status: decision,
      reviewedBy: actorUid,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewNote: note ?? '',
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (invoiceRef && invoiceData) {
      const paid = Number(invoiceData.paidAmount ?? 0) + Number(p.amount);
      tx.update(invoiceRef, {
        paidAmount: paid,
        status: computeInvoiceStatus(Number(invoiceData.amount), paid),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  return (await getPaymentById(id)) as PaymentRecord;
  }
