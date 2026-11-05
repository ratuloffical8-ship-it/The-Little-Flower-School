// src/hooks/useSiteSettings.ts
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** School info edited by the admin in "সেটিংস" and shown on the public website. */
export interface SiteSettings {
  schoolNameBn?: string;
  schoolNameEn?: string;
  address?: string;
  phone?: string;
  email?: string;
  mapUrl?: string;
  bkashNumber?: string;
  nagadNumber?: string;
  socialLinks?: { facebook?: string; youtube?: string };
  principalName?: string;
  principalTitle?: string;
  principalMessage?: string;
  aboutText?: string;
  admissionText?: string;
  officeHours?: string;
  admissionOpen?: boolean;
}

let cache: SiteSettings | null = null;
let inflight: Promise<SiteSettings | null> | null = null;

function load(): Promise<SiteSettings | null> {
  if (!inflight) {
    inflight = api
      .get<{ item?: SiteSettings }>('/api/settings/public', { noAuth: true })
      .then((r) => {
        cache = r.item ?? null;
        return cache;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Returns the saved settings (or null while loading / if the server is unreachable). */
export function useSiteSettings(): SiteSettings | null {
  const [settings, setSettings] = useState<SiteSettings | null>(cache);
  useEffect(() => {
    let alive = true;
    load().then((s) => {
      if (alive && s) setSettings(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return settings;
}

/** True when a value is empty or an old placeholder. */
export const isBlank = (v?: string | null): boolean =>
  !v || /^(Editable sample content|01X{9}|info@example\.com)/.test(v.trim());
