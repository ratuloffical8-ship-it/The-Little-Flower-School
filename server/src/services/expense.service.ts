// server/src/services/expense.service.ts
import { db, FieldValue } from '../config/firebase';
import { notFound } from '../utils/errors';

export const EXPENSES_COLLECTION = 'expenses';

export interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CreateExpenseInput {
  category: string;
  amount: number;
  date: string;
  description: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface ListExpensesParams {
  category?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

function toRecord(doc: FirebaseFirestore.DocumentSnapshot): ExpenseRecord {
  return { id: doc.id, ...(doc.data() as Omit<ExpenseRecord, 'id'>) };
}

export async function getExpenseById(id: string): Promise<ExpenseRecord | null> {
  const doc = await db.collection(EXPENSES_COLLECTION).doc(id).get();
  return doc.exists ? toRecord(doc) : null;
}

export async function listExpenses(
  params: ListExpensesParams,
): Promise<{ items: ExpenseRecord[]; total: number; page: number; pageSize: number }> {
  const { category, from, to, page, pageSize } = params;

  let q: FirebaseFirestore.Query = db.collection(EXPENSES_COLLECTION);
  if (category) q = q.where('category', '==', category);
  if (from) q = q.where('date', '>=', from);
  if (to) q = q.where('date', '<=', to);
  q = q.orderBy('date', 'desc');

  const countSnap = await q.count().get();
  const total = countSnap.data().count;

  const snap = await q.offset((page - 1) * pageSize).limit(pageSize).get();
  return { items: snap.docs.map(toRecord), total, page, pageSize };
}

export async function createExpense(
  input: CreateExpenseInput,
  actorUid: string,
): Promise<ExpenseRecord> {
  const ref = db.collection(EXPENSES_COLLECTION).doc();
  await ref.set({
    category: input.category,
    amount: input.amount,
    date: input.date,
    description: input.description,
    createdBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const created = await getExpenseById(ref.id);
  if (!created) throw notFound('খরচ পাওয়া যায়নি / Expense not found');
  return created;
}

export async function updateExpense(
  id: string,
  updates: UpdateExpenseInput,
): Promise<ExpenseRecord> {
  const ref = db.collection(EXPENSES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw notFound('খরচ পাওয়া যায়নি / Expense not found');

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) data[key] = value;
  }
  data.updatedAt = FieldValue.serverTimestamp();
  await ref.update(data);

  const updated = await getExpenseById(id);
  if (!updated) throw notFound('খরচ পাওয়া যায়নি / Expense not found');
  return updated;
}

export async function deleteExpense(id: string): Promise<void> {
  const ref = db.collection(EXPENSES_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw notFound('খরচ পাওয়া যায়নি / Expense not found');
  await ref.delete();
    }
