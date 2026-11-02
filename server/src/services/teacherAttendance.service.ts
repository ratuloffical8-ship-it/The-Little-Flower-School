// server/src/services/teacherAttendance.service.ts
import { db, FieldValue } from '../config/firebase';
import { badRequest } from '../utils/errors';

export const TEACHER_ATTENDANCE_COLLECTION = 'teacherAttendance';
const TEACHERS_COLLECTION = 'teachers';
const BATCH_LIMIT = 400;

export type TeacherAttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface TeacherAttendanceRecord {
  /** Doc ID = `${date}_${teacherId}` */
  id: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  status: TeacherAttendanceStatus;
  /** Number of classes (periods) the teacher took that day */
  classesTaught: number;
  note?: string;
  markedBy: string;
  updatedAt?: unknown;
}

export interface TeacherAttendanceEntry {
  teacherId: string;
  status: TeacherAttendanceStatus;
  classesTaught?: number;
  note?: string;
}

export const teacherAttendanceDocId = (date: string, teacherId: string): string =>
  `${date}_${teacherId}`;

export async function getTeacherDay(date: string): Promise<TeacherAttendanceRecord[]> {
  const snap = await db
    .collection(TEACHER_ATTENDANCE_COLLECTION)
    .where('date', '==', date)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<TeacherAttendanceRecord, 'id'>) }))
    .sort((a, b) => a.teacherId.localeCompare(b.teacherId));
}

/** All teachers' records for one month, with a per-teacher summary. */
export async function getTeacherMonth(month: string): Promise<{
  items: TeacherAttendanceRecord[];
  summary: Record<
    string,
    { present: number; absent: number; late: number; leave: number; classesTaught: number }
  >;
}> {
  const snap = await db
    .collection(TEACHER_ATTENDANCE_COLLECTION)
    .where('month', '==', month)
    .get();

  const items = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<TeacherAttendanceRecord, 'id'>) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.teacherId.localeCompare(b.teacherId));

  const summary: Record<
    string,
    { present: number; absent: number; late: number; leave: number; classesTaught: number }
  > = {};
  for (const r of items) {
    const s = (summary[r.teacherId] ??= {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      classesTaught: 0,
    });
    s[r.status] += 1;
    s.classesTaught += Number(r.classesTaught) || 0;
  }
  return { items, summary };
}

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

  // Every teacher must exist
  const refs = records.map((r) => db.collection(TEACHERS_COLLECTION).doc(r.teacherId));
  const snaps = await db.getAll(...refs);
  snaps.forEach((s, i) => {
    if (!s.exists) throw badRequest(`Teacher not found: ${records[i].teacherId}`);
  });

  for (let i = 0; i < records.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const r of records.slice(i, i + BATCH_LIMIT)) {
      const absent = r.status === 'absent' || r.status === 'leave';
      batch.set(
        db.collection(TEACHER_ATTENDANCE_COLLECTION).doc(teacherAttendanceDocId(date, r.teacherId)),
        {
          teacherId: r.teacherId,
          date,
          month: date.slice(0, 7),
          status: r.status,
          classesTaught: absent ? 0 : r.classesTaught ?? 0,
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
