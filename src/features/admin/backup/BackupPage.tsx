// src/features/admin/backup/BackupPage.tsx
import { useState } from 'react';
import { useApiGet } from '../../../hooks/useApi';
import { useLanguage } from '../../../hooks/useLanguage';
import { getIdToken } from '@/lib/firebase/auth';
import { env } from '@/lib/env';

interface Row {
  key: string;
  bn: string;
  count: number;
}

export default function BackupPage() {
  const { isBengali, locale } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const num = (n: number) => n.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US');

  const { data, isLoading, isWaking, error, execute } = useApiGet<{ items: Row[] }>('/api/backup', []);
  const rows = data?.items ?? [];

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  /** Download through fetch so the login token is sent, then save the file. */
  async function download(collection: string, format: 'csv' | 'json') {
    setMsg(null);
    setBusy(`${collection}.${format}`);
    try {
      const token = await getIdToken();
      const res = await fetch(
        `${env.VITE_API_BASE_URL}/api/backup/export?collection=${encodeURIComponent(collection)}&format=${format}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error(tr('ডাউনলোড করা যায়নি।', 'Download failed.'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tlfs-${collection}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: tr('ফাইল ডাউনলোড হয়েছে।', 'File downloaded.') });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : tr('ব্যর্থ হয়েছে।', 'Failed.') });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title">{tr('ব্যাকআপ', 'Backup')}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {tr(
            'স্কুলের তথ্য ফাইল হিসেবে নামিয়ে নিন। CSV ফাইল Excel-এ খোলে। প্রতি মাসে একবার "সব তথ্য" নামিয়ে মোবাইল বা গুগল ড্রাইভে রাখুন।',
            'Download the school data as files. CSV opens in Excel. Once a month, download "All data" and keep it on your phone or Google Drive.',
          )}
        </p>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-navy">{tr('সব তথ্য (একটি ফাইলে)', 'All data (one file)')}</p>
          <p className="text-xs text-ink/60">{tr('সম্পূর্ণ ব্যাকআপ, JSON ফাইল', 'Complete backup, JSON file')}</p>
        </div>
        <button
          type="button"
          className="btn-primary disabled:opacity-60"
          disabled={busy !== null}
          onClick={() => download('all', 'json')}
        >
          {busy === 'all.json' ? tr('তৈরি হচ্ছে…', 'Preparing…') : tr('সব তথ্য নামান', 'Download all')}
        </button>
      </div>

      {msg && <p className={msg.ok ? 'text-sm text-green-700' : 'error-text'}>{msg.text}</p>}

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}
      {isLoading && <div className="card text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</div>}
      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('তালিকা লোড করা যায়নি। শুধু সুপার অ্যাডমিন এটি ব্যবহার করতে পারেন।', 'Could not load. Only the super admin can use this.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card divide-y divide-surface p-0">
          {rows.map((r) => (
            <div key={r.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-navy">{r.bn}</p>
                <p className="text-xs text-ink/50">
                  {num(r.count)} {tr('টি রেকর্ড', 'records')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-outline px-3 py-1.5 text-sm disabled:opacity-60"
                  disabled={busy !== null || r.count === 0}
                  onClick={() => download(r.key, 'csv')}
                >
                  {busy === `${r.key}.csv` ? '…' : 'CSV'}
                </button>
                <button
                  type="button"
                  className="btn-outline px-3 py-1.5 text-sm disabled:opacity-60"
                  disabled={busy !== null || r.count === 0}
                  onClick={() => download(r.key, 'json')}
                >
                  {busy === `${r.key}.json` ? '…' : 'JSON'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-ink/50">
        {tr(
          'ছবি ও স্ক্রিনশট ImgBB-তে থাকে, ব্যাকআপে শুধু তাদের লিংক থাকে। শিক্ষকদের লগইন (পাসওয়ার্ড) Firebase-এ থাকে, ব্যাকআপে আসে না।',
          'Photos and screenshots live on ImgBB; the backup only has their links. Login accounts (passwords) live in Firebase and are not included.',
        )}
      </p>
    </div>
  );
    }
