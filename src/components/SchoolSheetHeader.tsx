// src/components/SchoolSheetHeader.tsx
import { useSiteSettings, isBlank } from '@/hooks/useSiteSettings';

/** School name, logo, address and phone shown on top of every printed sheet. */
export default function SchoolSheetHeader({ title }: { title: string }) {
  const site = useSiteSettings();
  const name = isBlank(site?.schoolNameBn) ? 'দি লিটল ফ্লাওয়ার স্কুল' : site?.schoolNameBn;
  return (
    <div className="mb-3 border-b-2 border-black pb-2 text-center">
      <div className="flex items-center justify-center gap-3">
        <img src="/images/logo.png" alt="" className="h-14 w-14 object-contain" />
        <div>
          <div className="text-xl font-bold">{name}</div>
          {!isBlank(site?.schoolNameEn) && <div className="text-xs">{site?.schoolNameEn}</div>}
          {(!isBlank(site?.address) || !isBlank(site?.phone)) && (
            <div className="text-[11px]">
              {[site?.address, site?.phone].filter((x) => !isBlank(x)).join(' | ')}
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto mt-2 inline-block rounded border border-black px-5 py-0.5 text-sm font-bold">
        {title}
      </div>
    </div>
  );
              }
