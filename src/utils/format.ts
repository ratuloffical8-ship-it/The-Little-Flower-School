// src/utils/format.ts

/**
 * Formatting utilities for dates, currency, phone numbers, and IDs.
 * All functions are pure and safe for use in React render paths.
 */

/* ── Date Formatting ── */

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Convert English digits to Bengali digits.
 */
export function toBengaliDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => BN_DIGITS[parseInt(d)]);
}

/**
 * Format an ISO date string to a human-readable format.
 * @param isoDate - ISO 8601 date string (e.g. "2025-01-15" or full timestamp)
 * @param locale - 'bn' or 'en'
 * @returns Formatted date string
 */
export function formatDate(isoDate: string, locale: 'bn' | 'en' = 'bn'): string {
  if (!isoDate) return '';

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    if (locale === 'bn') {
      return `${toBengaliDigits(day)} ${BN_MONTHS[month]} ${toBengaliDigits(year)}`;
    }

    return `${EN_MONTHS[month]} ${day}, ${year}`;
  } catch {
    return isoDate;
  }
}

/**
 * Format an ISO date to short format: DD/MM/YYYY or DD-MM-YYYY.
 */
export function formatDateShort(isoDate: string, locale: 'bn' | 'en' = 'bn'): string {
  if (!isoDate) return '';

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    if (locale === 'bn') {
      return `${toBengaliDigits(day)}/${toBengaliDigits(month)}/${toBengaliDigits(year)}`;
    }

    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

/**
 * Format an ISO timestamp to date + time.
 */
export function formatDateTime(isoDate: string, locale: 'bn' | 'en' = 'bn'): string {
  if (!isoDate) return '';

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;

    const dateStr = formatDate(isoDate, locale);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    if (locale === 'bn') {
      const bnAmpm = hours >= 12 ? 'অপরাহ্ণ' : 'পূর্বাহ্ণ';
      return `${dateStr}, ${toBengaliDigits(displayHours)}:${toBengaliDigits(minutes)} ${bnAmpm}`;
    }

    return `${dateStr}, ${displayHours}:${minutes} ${ampm}`;
  } catch {
    return isoDate;
  }
}

/**
 * Get relative time string (e.g., "2 hours ago").
 */
export function formatRelativeTime(isoDate: string, locale: 'bn' | 'en' = 'bn'): string {
  if (!isoDate) return '';

  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (locale === 'bn') {
    if (diffSec < 60) return 'এইমাত্র';
    if (diffMin < 60) return `${toBengaliDigits(diffMin)} মিনিট আগে`;
    if (diffHour < 24) return `${toBengaliDigits(diffHour)} ঘণ্টা আগে`;
    if (diffDay < 30) return `${toBengaliDigits(diffDay)} দিন আগে`;
    return formatDate(isoDate, 'bn');
  }

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(isoDate, 'en');
}

/* ── Currency ── */

/**
 * Format a number as Bangladeshi Taka.
 * @param amount - numeric amount
 * @param locale - 'bn' or 'en'
 * @returns e.g. "৳ ১,২৫০.০০" or "৳ 1,250.00"
 */
export function formatCurrency(amount: number, locale: 'bn' | 'en' = 'bn'): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '৳ ০.০০';

  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (locale === 'bn') {
    return `৳ ${toBengaliDigits(formatted)}`;
  }

  return `৳ ${formatted}`;
}

/**
 * Format currency without decimals (for dashboard stats).
 */
export function formatCurrencyShort(amount: number, locale: 'bn' | 'en' = 'bn'): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '৳ ০';

  if (amount >= 10000000) {
    const val = (amount / 10000000).toFixed(1);
    return locale === 'bn'
      ? `৳ ${toBengaliDigits(val)} কোটি`
      : `৳ ${val} Cr`;
  }

  if (amount >= 100000) {
    const val = (amount / 100000).toFixed(1);
    return locale === 'bn'
      ? `৳ ${toBengaliDigits(val)} লক্ষ`
      : `৳ ${val} L`;
  }

  if (amount >= 1000) {
    const val = (amount / 1000).toFixed(1);
    return locale === 'bn'
      ? `৳ ${toBengaliDigits(val)} হাজার`
      : `৳ ${val}K`;
  }

  return formatCurrency(amount, locale);
}

/* ── Phone ── */

/**
 * Format a Bangladeshi mobile number for display.
 * Input: "01712345678" → Output: "০১৭১২-৩৪৫৬৭৮" or "01712-345678"
 */
export function formatPhone(phone: string, locale: 'bn' | 'en' = 'bn'): string {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    const formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    return locale === 'bn' ? toBengaliDigits(formatted) : formatted;
  }

  return locale === 'bn' ? toBengaliDigits(phone) : phone;
}

/* ── Percentage ── */

export function formatPercentage(value: number, locale: 'bn' | 'en' = 'bn'): string {
  const formatted = value.toFixed(2);
  return locale === 'bn' ? `${toBengaliDigits(formatted)}%` : `${formatted}%`;
}

/* ── GPA ── */

export function formatGPA(gpa: number, locale: 'bn' | 'en' = 'bn'): string {
  const formatted = gpa.toFixed(2);
  return locale === 'bn' ? toBengaliDigits(formatted) : formatted;
}

/* ── File Size ── */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
