// server/src/routes/backup.ts
import { Router, Request, RequestHandler, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, requireRole } from '../middleware/auth';
import { badRequest } from '../utils/errors';

/**
 * Data export for the school (super_admin only).
 *   GET /api/backup                       → [{ key, count }] what can be exported
 *   GET /api/backup/export?collection=students&format=csv|json
 *   GET /api/backup/export?collection=all  (JSON of everything)
 *
 * Firestore on the free plan has no automatic backup, so the admin downloads these files
 * (CSV opens in Excel). Photos/screenshots are stored on ImgBB; only their links are exported.
 */
const router = Router();

const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

const COLLECTIONS: Array<{ key: string; bn: string }> = [
  { key: 'students', bn: 'শিক্ষার্থী' },
  { key: 'teachers', bn: 'শিক্ষক' },
  { key: 'admissionApplications', bn: 'ভর্তি আবেদন' },
  { key: 'payments', bn: 'পেমেন্ট' },
  { key: 'invoices', bn: 'ফি ও ইনভয়েস' },
  { key: 'expenses', bn: 'আয়-ব্যয়' },
  { key: 'attendance', bn: 'ছাত্র উপস্থিতি' },
  { key: 'teacherAttendance', bn: 'শিক্ষক হাজিরা' },
  { key: 'teacherClassLogs', bn: 'শিক্ষকের ক্লাস লগ' },
  { key: 'exams', bn: 'পরীক্ষা' },
  { key: 'results', bn: 'ফলাফল' },
  { key: 'notices', bn: 'নোটিশ' },
  { key: 'gallery', bn: 'গ্যালারি' },
  { key: 'faq', bn: 'প্রশ্নোত্তর' },
  { key: 'contactMessages', bn: 'যোগাযোগ বার্তা' },
  { key: 'schoolSettings', bn: 'স্কুল সেটিংস' },
  { key: 'auditLogs', bn: 'কার্যকলাপ লগ' },
];
const MAX_DOCS = 20000;

/** Firestore Timestamp → ISO string, recursively. */
function plain(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = plain(x);
    return out;
  }
  return v;
}

function flatten(obj: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (obj === null || obj === undefined) {
    if (prefix) out[prefix] = '';
  } else if (Array.isArray(obj)) {
    out[prefix] = JSON.stringify(obj);
  } else if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out[prefix] = String(obj);
  }
  return out;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  const flat = rows.map((r) => flatten(r));
  const cols = [...new Set(flat.flatMap((r) => Object.keys(r)))].sort((a, b) =>
    a === 'id' ? -1 : b === 'id' ? 1 : a.localeCompare(b),
  );
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [cols.map(esc).join(',')];
  for (const r of flat) lines.push(cols.map((c) => esc(r[c] ?? '')).join(','));
  return '﻿' + lines.join('\r\n'); // BOM so Excel reads Bengali correctly
}

async function readAll(key: string): Promise<Array<Record<string, unknown>>> {
  const snap = await db.collection(key).limit(MAX_DOCS).get();
  return snap.docs.map((d) => ({ id: d.id, ...(plain(d.data()) as Record<string, unknown>) }));
}

router.use(verifyToken, requireRole('super_admin'));

router.get(
  '/',
  ah(async (_req, res) => {
    const items = await Promise.all(
      COLLECTIONS.map(async (c) => {
        const snap = await db.collection(c.key).count().get();
        return { key: c.key, bn: c.bn, count: snap.data().count };
      }),
    );
    res.json({ items });
  }),
);

router.get(
  '/export',
  ah(async (req, res) => {
    const key = String(req.query.collection ?? '');
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const stamp = new Date().toISOString().slice(0, 10);

    if (key === 'all') {
      const data: Record<string, unknown> = {};
      for (const c of COLLECTIONS) data[c.key] = await readAll(c.key);
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="tlfs-backup-${stamp}.json"`);
      res.send(JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2));
      return;
    }

    if (!COLLECTIONS.some((c) => c.key === key)) throw badRequest('Unknown collection');
    const rows = await readAll(key);

    if (format === 'csv') {
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="tlfs-${key}-${stamp}.csv"`);
      res.send(toCsv(rows));
    } else {
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="tlfs-${key}-${stamp}.json"`);
      res.send(JSON.stringify(rows, null, 2));
    }
  }),
);

export default router;
