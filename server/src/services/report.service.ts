// server/src/services/report.service.ts
import { db, Timestamp } from '../config/firebase';
import { badRequest } from '../utils/errors';
import { getActiveSessionId } from './session.service';

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SCAN = 5000;
const MAX_ATTENDANCE_SCAN = 20000;
export const MAX_FINANCE_DAYS = 366;
export const MAX_ATTENDANCE_DAYS = 92;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ───────────── Date helpers (Bangladesh time, UTC+6) ───────────── */

export function todayBd(): string {
  return new Date(Date.now() + BD_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** First day of the current BD month → today (BD). */
export function defaultMonthRange(): { from: string; to: string } {
  const today = todayBd();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

function assertRange(from: string, to: string, maxDays: number): void {
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    throw badRequest('তারিখ সঠিক নয় / Invalid date');
  }
  if (from > to) {
    throw badRequest('শুরুর তারিখ শেষ তারিখের পরে হতে পারে না / "from" must not be after "to"');
  }
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS + 1;
  if (days > maxDays) {
    throw badRequest(`Date range too large (max ${maxDays} days)`);
  }
}

function bdStart(date: string): Date {
  return new Date(`${date}T00:00:00+06:00`);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function monthOfDate(d: Date): string {
  return new Date(d.getTime() + BD_OFFSET_MS).toISOString().slice(0, 7);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function countWhere(
  collection: string,
  field: string,
  op: FirebaseFirestore.WhereFilterOp,
  value: unknown,
): Promise<number> {
  const snap = await db.collection(collection).where(field, op, value).count().get();
  return snap.data().count;
}

/* ───────────── Admissions report ───────────── */

export interface AdmissionsReport {
  sessionId: string;
  total: number;
  byStatus: Record<string, number>;
  truncated: boolean;
}

export async function getAdmissionsReport(sessionId?: string): Promise<AdmissionsReport> {
  const sid = sessionId ?? (await getActiveSessionId());
  const snap = await db
    .collection('admissionApplications')
    .where('sessionId', '==', sid)
    .select('status')
    .limit(MAX_SCAN + 1)
    .get();

  const truncated = snap.size > MAX_SCAN;
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const doc of snap.docs.slice(0, MAX_SCAN)) {
    const status = String(doc.get('status') ?? 'unknown');
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    total += 1;
  }
  return { sessionId: sid, total, byStatus, truncated };
}

/* ───────────── Dashboard (counts only — no money) ───────────── */

export interface DashboardSummary {
  students: { active: number };
  teachers: { active: number };
  applications: AdmissionsReport;
  payments: { pending: number };
  invoices: { outstanding: number };
  messages: { unread: number };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [students, teachers, applications, pendingPayments, outstanding, unread] =
    await Promise.all([
      countWhere('students', 'isActive', '==', true),
      countWhere('teachers', 'isActive', '==', true),
      getAdmissionsReport(),
      countWhere('payments', 'status', '==', 'pending'),
      countWhere('invoices', 'status', 'in', ['unpaid', 'partial']),
      countWhere('contactMessages', 'status', '==', 'new'),
    ]);

  return {
    students: { active: students },
    teachers: { active: teachers },
    applications,
    payments: { pending: pendingPayments },
    invoices: { outstanding },
    messages: { unread },
  };
}

/* ───────────── Finance report ───────────── */

export interface FinanceReport {
  from: string;
  to: string;
  collected: { total: number; count: number; byProvider: Record<string, number> };
  expenses: { total: number; count: number; byCategory: { category: string; total: number }[] };
  net: number;
  monthly: { month: string; collected: number; expenses: number; net: number }[];
  /** Current outstanding invoices (NOT limited by the date range). */
  outstanding: { count: number; amount: number };
  truncated: boolean;
}

export async function getFinanceReport(from: string, to: string): Promise<FinanceReport> {
  assertRange(from, to, MAX_FINANCE_DAYS);

  const startTs = Timestamp.fromDate(bdStart(from));
  const endTs = Timestamp.fromDate(new Date(bdStart(to).getTime() + DAY_MS)); // exclusive

  const [paySnap, expSnap, invSnap] = await Promise.all([
    db
      .collection('payments')
      .where('status', '==', 'verified')
      .where('reviewedAt', '>=', startTs)
      .where('reviewedAt', '<', endTs)
      .select('amount', 'provider', 'reviewedAt')
      .limit(MAX_SCAN + 1)
      .get(),
    db
      .collection('expenses')
      .where('date', '>=', from)
      .where('date', '<=', to)
      .select('amount', 'category', 'date')
      .limit(MAX_SCAN + 1)
      .get(),
    db
      .collection('invoices')
      .where('status', 'in', ['unpaid', 'partial'])
      .select('amount', 'paidAmount')
      .limit(MAX_SCAN + 1)
      .get(),
  ]);

  const truncated =
    paySnap.size > MAX_SCAN || expSnap.size > MAX_SCAN || invSnap.size > MAX_SCAN;

  const months = new Map<string, { collected: number; expenses: number }>();
  const bucket = (month: string) => {
    let b = months.get(month);
    if (!b) {
      b = { collected: 0, expenses: 0 };
      months.set(month, b);
    }
    return b;
  };

  let collectedTotal = 0;
  let collectedCount = 0;
  const byProvider: Record<string, number> = {};
  for (const doc of paySnap.docs.slice(0, MAX_SCAN)) {
    const amount = Number(doc.get('amount')) || 0;
    const provider = String(doc.get('provider') ?? 'unknown');
    const reviewed = toDate(doc.get('reviewedAt'));
    collectedTotal += amount;
    collectedCount += 1;
    byProvider[provider] = round2((byProvider[provider] ?? 0) + amount);
    if (reviewed) bucket(monthOfDate(reviewed)).collected += amount;
  }

  let expenseTotal = 0;
  let expenseCount = 0;
  const catMap = new Map<string, number>();
  for (const doc of expSnap.docs.slice(0, MAX_SCAN)) {
    const amount = Number(doc.get('amount')) || 0;
    const category = String(doc.get('category') ?? 'other');
    const date = String(doc.get('date') ?? '');
    expenseTotal += amount;
    expenseCount += 1;
    catMap.set(category, (catMap.get(category) ?? 0) + amount);
    if (DATE_RE.test(date)) bucket(date.slice(0, 7)).expenses += amount;
  }

  let outstandingAmount = 0;
  let outstandingCount = 0;
  for (const doc of invSnap.docs.slice(0, MAX_SCAN)) {
    const due = (Number(doc.get('amount')) || 0) - (Number(doc.get('paidAmount')) || 0);
    if (due > 0) {
      outstandingAmount += due;
      outstandingCount += 1;
    }
  }

  const monthly = [...months.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, v]) => ({
      month,
      collected: round2(v.collected),
      expenses: round2(v.expenses),
      net: round2(v.collected - v.expenses),
    }));

  return {
    from,
    to,
    collected: { total: round2(collectedTotal), count: collectedCount, byProvider },
    expenses: {
      total: round2(expenseTotal),
      count: expenseCount,
      byCategory: [...catMap.entries()]
        .map(([category, total]) => ({ category, total: round2(total) }))
        .sort((a, b) => b.total - a.total),
    },
    net: round2(collectedTotal - expenseTotal),
    monthly,
    outstanding: { count: outstandingCount, amount: round2(outstandingAmount) },
    truncated,
  };
}

/* ───────────── Attendance report ───────────── */

export interface AttendanceDay {
  date: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
}

export interface AttendanceReport {
  from: string;
  to: string;
  classId: string | null;
  totals: {
    present: number;
    absent: number;
    late: number;
    leave: number;
    total: number;
    /** (present + late) / total × 100 */
    percentage: number;
  };
  days: AttendanceDay[];
  truncated: boolean;
}

export async function getAttendanceReport(params: {
  from: string;
  to: string;
  classId?: string;
}): Promise<AttendanceReport> {
  const { from, to, classId } = params;
  assertRange(from, to, MAX_ATTENDANCE_DAYS);

  let q: FirebaseFirestore.Query = db.collection('attendance');
  if (classId) q = q.where('classId', '==', classId);
  q = q.where('date', '>=', from).where('date', '<=', to);

  const snap = await q.select('date', 'status').limit(MAX_ATTENDANCE_SCAN + 1).get();
  const truncated = snap.size > MAX_ATTENDANCE_SCAN;

  const dayMap = new Map<string, AttendanceDay>();
  const totals = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };

  for (const doc of snap.docs.slice(0, MAX_ATTENDANCE_SCAN)) {
    const date = String(doc.get('date') ?? '');
    const status = String(doc.get('status') ?? '');
    if (status !== 'present' && status !== 'absent' && status !== 'late' && status !== 'leave') {
      continue;
    }
    let day = dayMap.get(date);
    if (!day) {
      day = { date, present: 0, absent: 0, late: 0, leave: 0, total: 0 };
      dayMap.set(date, day);
    }
    day[status] += 1;
    day.total += 1;
    totals[status] += 1;
    totals.total += 1;
  }

  const days = [...dayMap.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const percentage =
    totals.total === 0 ? 0 : round2(((totals.present + totals.late) / totals.total) * 100);

  return {
    from,
    to,
    classId: classId ?? null,
    totals: { ...totals, percentage },
    days,
    truncated,
  };
  }
