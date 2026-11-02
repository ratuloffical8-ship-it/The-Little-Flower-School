// server/src/services/teacherAttendance.service.ts
import { db, FieldValue } from '../config/firebase';
import { badRequest, notFound } from '../utils/errors';

export const TEACHER_ATTENDANCE_COLLECTION = 'teacherAttendance';
export const TEACHER_CLASS_LOG_COLLECTION = 'teacherClassLogs';
const TEACHERS_COLLECTION = 'teachers';
const BATCH_LIMIT = 400;

export type TeacherAttendanceStatus = 'present' | 'absent' | 'late' | 'leave';
export type ClassLogStatus = 'completed' | 'partial' | 'not_taken';

/** Today's date / time in Bangladesh (UTC+6) */
export const nowBd = (): { date: string; time: string } => {
  const iso = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};

// ───────────────────────── Types ─────────────────────────

export interface TeacherAttendanceRecord {
  /** Doc ID = `${date}_${teacherId}` */
  id: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  status: TeacherAttendanceStatus;
  /** HH:mm (Bangladesh time) when the teacher checked in herself/himself */
  checkInTime?: string;
  /** true = teacher marked own attendance; false = marked by an admin */
  selfMarked?: boolean;
  note?: string;
  markedBy: string;
  updatedAt?: unknown;
}

export interface TeacherAttendanceEntry {
  teacherId: string;
  status: TeacherAttendanceStatus;
  note?: string;
}

export interface ClassLog {
  id: string;
  teacherId: string;
  date: string;
  month: string;
  /** schoolClasses doc id, e.g. "play", "nursery", "5" */
  classId: string;
  subject: string;
  period?: number;
  topic?: string;
  status: ClassLogStatus;
  note?: string;
  createdBy: string;
  updatedAt?: unknown;
}

export interface ClassLogInput {
  classId: string;
  subject: string;
  period?: number;
  topic?: string;
  status: ClassLogStatus;
  note?: string;
}

export interface TeacherMonthSummary {
  present: number;
  absent: number;
  late: number;
  leave: number;
  classesTotal: number;
  classesCompleted: number;
  classesPartial: number;
  classesNotTaken: number;
  /** completed / total * 100 (1 decimal) */
  completionPercent: number;
}

const emptySummary = (): TeacherMonthSummary => ({
  present: 0,
  absent: 0,
  late: 0,
  leave: 0,
  classesTotal: 0,
  classesCompleted: 0,
  classesPartial: 0,
  classesNotTaken: 0,
  completionPercent: 0,
});

export const teacherAttendanceDocId = (date: string, teacherId: string): string =>
  `${date}_${teacherId}`;

// ───────────────────── Teacher lookup (login email → teacher record) ─────────────────────

export interface TeacherLite {
  id: string;
  name: string;
  designation?: string;
  subject?: string;
  email?: string;
  isActive?: boolean;
}

export async function findTeacherByEmail(email: string | null | undefined): Promise<TeacherLite | null> {
  const wanted = (email ?? '').trim().toLowerCase();
  if (!wanted) return null;
  const snap = await db.collection(TEACHERS_COLLECTION).limit(500).get();
  const doc = snap.docs.find(
    (d) => String(d.data().email ?? '').trim().toLowerCase() === wanted && d.data().isActive !== false,
  );
  if (!doc) return null;
  const x = doc.data();
  return {
    id: doc.id,
    name: String(x.name ?? ''),
    designation: x.designation,
    subject: x.subject,
    email: x.email,
    isActive: x.isActive,
  };
}

// ───────────────────── Attendance ─────────────────────

const mapAtt = (d: FirebaseFirestore.QueryDocumentSnapshot): TeacherAttendanceRecord => ({
  id: d.id,
  ...(d.data() as Omit<TeacherAttendanceRecord, 'id'>),
});

export async function getTeacherDay(date: string): Promise<TeacherAttendanceRecord[]> {
  const snap = await db.collection(TEACHER_ATTENDANCE_COLLECTION).where('date', '==', date).get();
  return snap.docs.map(mapAtt).sort((a, b) => a.teacherId.localeCompare(b.teacherId));
}

export async function getAttendanceMonth(
  month: string,
  teacherId?: string,
): Promise<TeacherAttendanceRecord[]> {
  let q: FirebaseFirestore.Query = db
    .collection(TEACHER_ATTENDANCE_COLLECTION)
    .where('month', '==', month);
  if (teacherId) q = q.where('teacherId', '==', teacherId);
  const snap = await q.get();
  return snap.docs
    .map((d) => mapAtt(d as FirebaseFirestore.QueryDocumentSnapshot))
    .sort((a, b) => a.date.localeCompare(b.date) || a.teacherId.localeCompare(b.teacherId));
}

export async function getTeacherDayOne(
  teacherId: string,
  date: string,
): Promise<TeacherAttendanceRecord | null> {
  const doc = await db
    .collection(TEACHER_ATTENDANCE_COLLECTION)
    .doc(teacherAttendanceDocId(date, teacherId))
    .get();
  return doc.exists ? mapAtt(doc as FirebaseFirestore.QueryDocumentSnapshot) : null;
}

/** Teacher marks own attendance for today (present / late). */
export async function selfCheckIn(
  teacherId: string,
  status: 'present' | 'late',
  note: string | undefined,
  actorUid: string,
): Promise<TeacherAttendanceRecord> {
  const { date, time } = nowBd();
  const ref = db.collection(TEACHER_ATTENDANCE_COLLECTION).doc(teacherAttendanceDocId(date, teacherId));
  const existing = await ref.get();
  await ref.set(
    {
      teacherId,
      date,
      month: date.slice(0, 7),
      status,
      // keep the first check-in time if the teacher already checked in today
      checkInTime: existing.exists && existing.data()?.checkInTime ? existing.data()?.checkInTime : time,
      selfMarked: true,
      note: note ? note : FieldValue.delete(),
      markedBy: actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return (await getTeacherDayOne(teacherId, date)) as TeacherAttendanceRecord;
}

/** Admin marks attendance for teachers (e.g. those without a smartphone). */
export async function markTeacherDay(
  date: string,
  records: TeacherAttendanceEntry[],
  actorUid: string,
): Promise<{ saved: number }> {
  const seen = new Set<string>();
  for (const r of records) {
    if (seen.has(r.teacherId)) throw badRequest(`Duplicate teacher in request: ${r.teacherId}`);
    seen.add(r.teacherId);
  }

  const refs = records.map((r) => db.collection(TEACHERS_COLLECTION).doc(r.teacherId));
  const snaps = await db.getAll(...refs);
  snaps.forEach((s, i) => {
    if (!s.exists) throw badRequest(`Teacher not found: ${records[i].teacherId}`);
  });

  for (let i = 0; i < records.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const r of records.slice(i, i + BATCH_LIMIT)) {
      batch.set(
        db.collection(TEACHER_ATTENDANCE_COLLECTION).doc(teacherAttendanceDocId(date, r.teacherId)),
        {
          teacherId: r.teacherId,
          date,
          month: date.slice(0, 7),
          status: r.status,
          selfMarked: false,
          note: r.note ? r.note : FieldValue.delete(),
          markedBy: actorUid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
  }
  return { saved: records.length };
}

// ───────────────────── Class logs ─────────────────────

const mapLog = (d: FirebaseFirestore.QueryDocumentSnapshot): ClassLog => ({
  id: d.id,
  ...(d.data() as Omit<ClassLog, 'id'>),
});

export async function listLogsForDay(teacherId: string, date: string): Promise<ClassLog[]> {
  const snap = await db
    .collection(TEACHER_CLASS_LOG_COLLECTION)
    .where('teacherId', '==', teacherId)
    .where('date', '==', date)
    .get();
  return snap.docs.map(mapLog).sort((a, b) => (a.period ?? 99) - (b.period ?? 99));
}

export async function listLogsForMonth(month: string, teacherId?: string): Promise<ClassLog[]> {
  let q: FirebaseFirestore.Query = db.collection(TEACHER_CLASS_LOG_COLLECTION).where('month', '==', month);
  if (teacherId) q = q.where('teacherId', '==', teacherId);
  const snap = await q.get();
  return snap.docs
    .map((d) => mapLog(d as FirebaseFirestore.QueryDocumentSnapshot))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.period ?? 99) - (b.period ?? 99));
}

export async function createLog(
  teacherId: string,
  date: string,
  input: ClassLogInput,
  actorUid: string,
): Promise<ClassLog> {
  const ref = db.collection(TEACHER_CLASS_LOG_COLLECTION).doc();
  await ref.set({
    teacherId,
    date,
    month: date.slice(0, 7),
    classId: input.classId,
    subject: input.subject,
    ...(input.period !== undefined ? { period: input.period } : {}),
    ...(input.topic ? { topic: input.topic } : {}),
    status: input.status,
    ...(input.note ? { note: input.note } : {}),
    createdBy: actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return mapLog((await ref.get()) as FirebaseFirestore.QueryDocumentSnapshot);
}

/** `ownerTeacherId` = restrict to that teacher's own logs (teachers); null = admin, any log. */
export async function updateLog(
  id: string,
  ownerTeacherId: string | null,
  input: ClassLogInput,
): Promise<ClassLog> {
  const ref = db.collection(TEACHER_CLASS_LOG_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || (ownerTeacherId && snap.data()?.teacherId !== ownerTeacherId)) {
    throw notFound('Class log');
  }
  await ref.update({
    classId: input.classId,
    subject: input.subject,
    period: input.period ?? FieldValue.delete(),
    topic: input.topic ? input.topic : FieldValue.delete(),
    status: input.status,
    note: input.note ? input.note : FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return mapLog((await ref.get()) as FirebaseFirestore.QueryDocumentSnapshot);
}

export async function deleteLog(id: string, ownerTeacherId: string | null): Promise<void> {
  const ref = db.collection(TEACHER_CLASS_LOG_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || (ownerTeacherId && snap.data()?.teacherId !== ownerTeacherId)) {
    throw notFound('Class log');
  }
  await ref.delete();
}

// ───────────────────── Monthly summary ─────────────────────

export function buildSummary(
  attendance: TeacherAttendanceRecord[],
  logs: ClassLog[],
): Record<string, TeacherMonthSummary> {
  const out: Record<string, TeacherMonthSummary> = {};
  for (const a of attendance) {
    const s = (out[a.teacherId] ??= emptySummary());
    s[a.status] += 1;
  }
  for (const l of logs) {
    const s = (out[l.teacherId] ??= emptySummary());
    s.classesTotal += 1;
    if (l.status === 'completed') s.classesCompleted += 1;
    else if (l.status === 'partial') s.classesPartial += 1;
    else s.classesNotTaken += 1;
  }
  for (const s of Object.values(out)) {
    s.completionPercent =
      s.classesTotal > 0 ? Math.round((s.classesCompleted / s.classesTotal) * 1000) / 10 : 0;
  }
  return out;
}

export async function getTeacherMonth(month: string): Promise<{
  items: TeacherAttendanceRecord[];
  classes: ClassLog[];
  summary: Record<string, TeacherMonthSummary>;
}> {
  const [items, classes] = await Promise.all([getAttendanceMonth(month), listLogsForMonth(month)]);
  return { items, classes, summary: buildSummary(items, classes) };
  }
