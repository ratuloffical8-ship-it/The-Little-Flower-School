// src/utils/grading.ts
/** Bangla, English and Maths must be passed — no teacher override is possible for them. */
const CORE_PATTERNS: readonly RegExp[] = [
  /^(বাংলা(?!দেশ)|bangla|bengali)/i,
  /^(ইংরেজি|ইংলিশ|english)/i,
  /^(গণিত|গনিত|অঙ্ক|অংক|math)/i,
];

export const isCoreSubject = (name: string): boolean =>
  CORE_PATTERNS.some((re) => re.test(String(name ?? '').trim()));
