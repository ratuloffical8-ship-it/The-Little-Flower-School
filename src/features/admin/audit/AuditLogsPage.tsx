// src/features/admin/audit/AuditLogsPage.tsx
import { useState } from 'react';
import { useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';

interface LogItem {
  id: string;
  action: string;
  actorEmail: string;
  actorUid: string;
  targetCollection: string;
  targetId: string;
  at: string | null;
}

/** Friendly names for the action codes written by the server. */
const ACTIONS: Record<string, [string, string]> = {
  'admission.approve': ['ভর্তি অনুমোদন', 'Admission approved'],
  'admission.status': ['ভর্তির অবস্থা বদল', 'Admission status changed'],
  'admission.update': ['ভর্তি আবেদন সম্পাদনা', 'Admission edited'],
  'student.create': ['শিক্ষার্থী যোগ', 'Student added'],
  'student.update': ['শিক্ষার্থী সম্পাদনা', 'Student edited'],
  'student.delete': ['শিক্ষার্থী মুছে ফেলা', 'Student deleted'],
  'teacher.create': ['শিক্ষক যোগ', 'Teacher added'],
  'teacher.update': ['শিক্ষক সম্পাদনা', 'Teacher edited'],
  'teacher.delete': ['শিক্ষক মুছে ফেলা', 'Teacher deleted'],
  'payment.review': ['পেমেন্ট যাচাই', 'Payment reviewed'],
  'settings.update': ['সেটিংস বদল', 'Settings changed'],
  'contact.delete': ['বার্তা মুছে ফেলা', 'Message deleted'],
  'user.create': ['ব্যবহারকারী তৈরি', 'User created'],
  'user.update': ['ব্যবহারকারী সম্পাদনা', 'User edited'],
  'user.delete': ['ব্যবহারকারী মুছে ফেলা', 'User deleted'],
};

const COLLECTIONS: Array<[string, string, string]> = [
  ['', 'সব', 'All'],
  ['students', 'শিক্ষার্থী', 'Students'],
  ['teachers', 'শিক্ষক', 'Teachers'],
  ['admissionApplications', 'ভর্তি আবেদন', 'Admissions'],
  ['payments', 'পেমেন্ট', 'Payments'],
  ['invoices', 'ইনভয়েস', 'Invoices'],
  ['schoolSettings', 'সেটিংস', 'Settings'],
  ['users', 'ব্যবহারকারী', 'Users'],
];

export default function AuditLogsPage() {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const [collection, setCollection] = useState('');
  const [limit, setLimit] = useState(100);

  const qs = `/api/audit?limit=${limit}${collection ? `&targetCollection=${encodeURIComponent(collection)}` : ''}`;
  const { data, isLoading, isWaking, error, execute } = useApiGet<{ items: LogItem[] }>(qs, [collection, limit]);
  const items = data?.items ?? [];

  const when = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(isBengali ? 'bn-BD' : 'en-GB', {
          timeZone: 'Asia/Dhaka',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '—';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title">{tr('কার্যকলাপ লগ', 'Activity log')}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {tr('কে কখন কী বদলেছে তার তালিকা (সর্বশেষ আগে)।', 'Who changed what and when (latest first).')}
        </p>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{tr('বিভাগ', 'Section')}</label>
          <select className="input-field" value={collection} onChange={(e) => setCollection(e.target.value)}>
            {COLLECTIONS.map(([v, bn, en]) => (
              <option key={v} value={v}>
                {tr(bn, en)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{tr('কতগুলো', 'How many')}</label>
          <select className="input-field" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[50, 100, 200, 300].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-outline" onClick={() => execute()}>
          {tr('রিফ্রেশ', 'Refresh')}
        </button>
      </div>

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}
      {isLoading && <div className="card text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</div>}
      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('লগ লোড করা যায়নি। শুধু সুপার অ্যাডমিন এটি দেখতে পারেন।', 'Could not load. Only the super admin can view this.')}</p>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="card text-sm text-ink/70">{tr('এখনো কোনো কার্যকলাপ নেই।', 'No activity yet.')}</div>
      )}

      {items.length > 0 && (
        <div className="card divide-y divide-surface p-0">
          {items.map((l) => {
            const a = ACTIONS[l.action];
            return (
              <div key={l.id} className="space-y-0.5 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-navy">{a ? tr(a[0], a[1]) : l.action}</span>
                  <span className="text-xs text-ink/50">{when(l.at)}</span>
                </div>
                <div className="text-xs text-ink/60">
                  {l.actorEmail || l.actorUid || '—'}
                  {l.targetId ? ` · ${l.targetCollection} / ${l.targetId}` : ` · ${l.targetCollection}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
          }
