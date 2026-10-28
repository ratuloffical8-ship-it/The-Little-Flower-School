// src/components/ServerWaking.tsx
import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface ServerWakingProps {
  /** Called when user clicks retry */
  onRetry?: () => void;
  /** Auto-retry after this many seconds (0 = no auto-retry) */
  autoRetrySeconds?: number;
}

export default function ServerWaking({
  onRetry,
  autoRetrySeconds = 30,
}: ServerWakingProps) {
  const { t, isBengali } = useLanguage();
  const [countdown, setCountdown] = useState(autoRetrySeconds);

  useEffect(() => {
    if (autoRetrySeconds <= 0 || !onRetry) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRetry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRetrySeconds, onRetry]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative">
        <WifiOff size={48} className="text-warning" />
        <span className="absolute -right-1 -top-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning/40" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-warning" />
        </span>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-navy">
          {isBengali ? 'সার্ভার প্রস্তুত হচ্ছে…' : 'Server is waking up…'}
        </h2>
        <p className="mt-1 text-sm text-ink-light">
          {isBengali
            ? 'সার্ভার ঘুম থেকে জাগছে। এতে ৩০-৬০ সেকেন্ড সময় লাগতে পারে। অনুগ্রহ করে অপেক্ষা করুন।'
            : 'The server is waking up from sleep. This may take 30–60 seconds. Please wait.'}
        </p>
      </div>

      {autoRetrySeconds > 0 && countdown > 0 && (
        <p className="text-xs text-ink-light">
          {isBengali
            ? `${countdown} সেকেন্ড পর স্বয়ংক্রিয়ভাবে পুনরায় চেষ্টা করা হবে`
            : `Auto-retrying in ${countdown}s`}
        </p>
      )}

      {onRetry && (
        <button
          onClick={() => {
            setCountdown(autoRetrySeconds);
            onRetry();
          }}
          className="btn-outline inline-flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} />
          {t('common.retry')}
        </button>
      )}

      <p className="max-w-sm text-xs text-ink-light/60">
        {isBengali
          ? 'নোট: ফ্রি হোস্টিং প্ল্যানে সার্ভার কিছু সময় নিষ্ক্রিয় থাকলে ঘুমিয়ে পড়ে। প্রথম অনুরোধে জাগতে সময় লাগে।'
          : 'Note: On free hosting, the server sleeps after inactivity. The first request takes longer to respond.'}
      </p>
    </div>
  );
}
