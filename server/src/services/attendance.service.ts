// server/src/services/attendance.service.ts
import { db, FieldValue } from '../config/firebase';
import { badRequest } from '../utils/errors';

export const ATTENDANCE_COLLECTION = 'attendance';
const STUDENTS_COLLECTION = 'students';
const BATCH_LIMIT = 400;

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';
export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'leave',
];

export interface AttendanceRecord {
  /** Doc ID = `${date}_${studentId}` */
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  classId: string;
  sessionId: string;
  status: AttendanceStatus;
  note?: string;
  markedBy: string;
  updatedAt?: unknown;
}

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export interface MarkAttendanceInput {
  classId: string;
  sessionId: string;
  date: string;
  records: AttendanceEntry[];
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  /** (present + late) / total * 100, 2 decimals */
  percentage: number;
}

export const attendanceDocId = (date: string, studentId: string): string =>
  `${date}_${studentId}`;

export function summarizeAttendance(
  records: Array<Pick<AttendanceRecord, 'status'>>,
): AttendanceSummary {
  const s = { total: records.length, present: 0, absent: 0, late: 0, leave: 0 };
  for (const r of records) s[r.status] += 1;
  const percentage =
    s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 10000) / 100 : 0;
  return { ...s, percentage };
}

export async function getClassAttendance(
  classId: string,
  date: string,
): Promise<AttendanceRecord[]> {
  const snap = await db
    .collection(ATTENDANCE_COLLECTION)
    .where('classId', '==', classId)
    .where('date', '==', date)
    .get();

  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) }))
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
}

export async function markAttendance(
  input: MarkAttendanceInput,
  actorUid: string,
): Promise<{ saved: number }> {
  const { classId, sessionId, date, records } = input;

  // Roster of active students in this class
  const rosterSnap = await db
    .collection(STUDENTS_COLLECTION)
    .where('classId', '==', classId)
    .where('isActive', '==', true)
    .get();
  const roster = new Set<string>(
    rosterSnap.docs.map((d) => (d.data().studentId as string | undefined) ?? d.id),
  );

  const seen = new Set<string>();
  for (const r of records) {
    if (seen.has(r.studentId)) {
      throw badRequest(`Duplicate student in request: ${r.studentId}`);
    }
    seen.add(r.studentId);
    if (!roster.has(r.studentId)) {
      throw badRequest(`Student not found in this class: ${r.studentId}`);
    }
  }

  for (let i = 0; i < records.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const r of records.slice(i, i + BATCH_LIMIT)) {
      const ref = db
        .collection(ATTENDANCE_COLLECTION)
        .doc(attendanceDocId(date, r.studentId));
      batch.set(
        ref,
        {
          studentId: r.studentId,
          date,
          classId,
          sessionId,
          status: r.status,
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

export async function getStudentAttendance(
  studentId: string,
  from: string,
  to: string,
): Promise<{ items: AttendanceRecord[]; summary: AttendanceSummary }> {
  // Needs composite index: studentId asc + date asc
  const snap = await db
    .collection(ATTENDANCE_COLLECTION)
    .where('studentId', '==', studentId)
    .where('date', '>=', from)
    .where('date', '<=', to)
    .orderBy('date', 'asc')
    .get();

  const items = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AttendanceRecord, 'id'>),
  }));
  return { items, summary: summarizeAttendance(items) };
                                 }
