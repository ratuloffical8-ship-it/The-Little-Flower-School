// src/components/PrintOverlay.tsx
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Printer, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Full-screen preview of an A4 sheet with a Print / Save-as-PDF button.
 * Printing hides the rest of the site and prints only the sheet — free, no library.
 */
export default function PrintOverlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const { isBengali } = useLanguage();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="print-overlay fixed inset-0 z-[100] overflow-auto bg-gray-300">
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          #root { display: none !important; }
          .no-print { display: none !important; }
          .print-overlay { position: static !important; overflow: visible !important; background: #fff !important; }
          .print-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; width: 100% !important; padding: 0 !important; }
          html, body { background: #fff !important; overflow: visible !important; height: auto !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-navy px-3 py-2 text-white shadow">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded bg-gold px-4 py-2 text-sm font-semibold text-navy"
        >
          <Printer size={16} />
          {isBengali ? 'প্রিন্ট / PDF সেভ' : 'Print / Save PDF'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded border border-white/40 px-3 py-2 text-sm"
        >
          <X size={16} />
          {isBengali ? 'বন্ধ' : 'Close'}
        </button>
        <span className="w-full text-xs text-white/70 sm:w-auto">
          {isBengali
            ? 'PDF করতে: প্রিন্ট চাপুন → "PDF হিসেবে সেভ করুন" বেছে নিন।'
            : 'For PDF: tap Print → choose "Save as PDF".'}
        </span>
      </div>

      <div className="print-sheet mx-auto my-3 w-full max-w-[794px] bg-white p-5 text-[13px] leading-snug text-black shadow sm:p-8">
        {children}
      </div>
    </div>,
    document.body,
  );
}
