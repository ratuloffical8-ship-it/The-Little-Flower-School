// server/src/services/invoice.service.ts
import { db, FieldValue, Timestamp } from '../config/firebase';
import { generateId } from './counter.service';
import { findStudentByStudentId } from './student.service';
import { badRequest, notFound } from '../utils/errors';

export const INVOICES_COLLECTION = 'invoices';

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled';

export interface InvoiceRecord {
  id: string;
  studentId: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  note?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvoiceInput {
  studentId: string;
  feeType: string;
  amount: number;
  dueDate: string;
  note?: string;
}

export interface ListInvoicesParams {
  studentId?: string;
  status?: InvoiceStatus;
  page: number;
  pageSize: number;
}

const iso = (v: unknown): string | undefined =>
  v instanceof Timestamp ? v.toDate().toISOString() : (v as string | undefined);

function toRecord(doc: FirebaseFirestore.DocumentSnapshot): InvoiceRecord {
  const data = doc.data() ?? {};
  return {
    ...data,
    id: doc.id,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  } as InvoiceRecord;
}

export function computeInvoiceStatus(amount: number, paidAmount: number): InvoiceStatus {
  if (paidAmount <= 0) return 'unpaid';
  return paidAmount >= amount ? 'paid' : 'partial';
}

export async function getInvoiceById(id: string): Promise<InvoiceRecord | null> {
  const doc = await db.collection(INVOICES_COLLECTION).doc(id).get();
  return doc.exists ? toRecord(doc) : null;
}

export async function listInvoices(
  params: ListInvoicesParams
): Promise<{ items: InvoiceRecord[]; total: number; page: number; pageSize: number }> {
  const { studentId, status, page, pageSize } = params;

  let q: FirebaseFirestore.Query = db.collection(INVOICES_COLLECTION);
  if (studentId) q = q.where('studentId', '==', studentId);
  if (status) q = q.where('status', '==', status);
  q = q.orderBy('createdAt', 'desc');

  const total = (await q.count().get()).data().count;
  const snap = await q.offset((page - 1) * pageSize).limit(pageSize).get();

  return { items: snap.docs.map(toRecord), total, page, pageSize };
}

export async function createInvoice(input: CreateInvoiceInput, actorUid: string): Promise<InvoiceRecord> {
  const student = await findStudentByStudentId(input.studentId);
  if (!student) throw notFound('Student not found');

  const id = await generateId({ type: 'invoice' });
  await db
    .collection(INVOICES_COLLECTION)
    .doc(id)
    .set({
      studentId: student.studentId,
      feeType: input.feeType,
      amount: input.amount,
      paidAmount: 0,
      status: 'unpaid',
      dueDate: input.dueDate,
      note: input.note ?? '',
      createdBy: actorUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return (await getInvoiceById(id)) as InvoiceRecord;
}

export async function cancelInvoice(id: string): Promise<InvoiceRecord> {
  const ref = db.collection(INVOICES_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw notFound('Invoice not found');

  const inv = toRecord(doc);
  if (inv.status === 'cancelled') throw badRequest('Invoice already cancelled');
  if (inv.paidAmount > 0) throw badRequest('Cannot cancel an invoice that has verified payments');

  await ref.update({ status: 'cancelled', updatedAt: FieldValue.serverTimestamp() });
  return (await getInvoiceById(id)) as InvoiceRecord;
  }
