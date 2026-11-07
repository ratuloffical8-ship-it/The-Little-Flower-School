// server/src/utils/grading.ts
/**
 * Bangladesh GPA 5.00 grading.
 * The scale is configurable: pass `options.scale` to override the default.
 */

export interface GradeBand {
  /** Minimum percentage (inclusive) for this band */
  min: number;
  grade: string;
  point: number;
}

export const DEFAULT_GRADE_SCALE: readonly GradeBand[] = [
  { min: 80, grade: 'A+', point: 5.0 },
  { min: 70, grade: 'A', point: 4.0 },
  { min: 60, grade: 'A-', point: 3.5 },
  { min: 50, grade: 'B', point: 3.0 },
  { min: 40, grade: 'C', point: 2.0 },
  { min: 33, grade: 'D', point: 1.0 },
  { min: 0, grade: 'F', point: 0.0 },
];

export const DEFAULT_PASS_PERCENT = 33;
/** Bangladesh 4th-subject rule: only points above this count as a bonus */
export const OPTIONAL_BASE_POINT = 2;

export interface SubjectInput {
  name: string;
  fullMarks: number;
  /** Absolute pass marks; falls back to passPercent when omitted */
  passMarks?: number;
  isOptional?: boolean;
  /** null = absent */
  marks: number | null;
}

export interface SubjectResult {
  name: string;
  fullMarks: number;
  marks: number | null;
  percentage: number;
  grade: string;
  gradePoint: number;
  passed: boolean;
  isOptional: boolean;
}

export interface GradingOptions {
  scale?: readonly GradeBand[];
  passPercent?: number;
}

export interface ComputedResult {
  subjects: SubjectResult[];
  total: number;
  fullTotal: number;
  percentage: number;
  gpa: number;
  grade: string;
  passed: boolean;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function gradeForPercentage(
  percentage: number,
  scale: readonly GradeBand[] = DEFAULT_GRADE_SCALE,
): GradeBand {
  const bands = [...scale].sort((a, b) => b.min - a.min);
  return bands.find((b) => percentage >= b.min) ?? bands[bands.length - 1];
}

export function gradeForGpa(
  gpa: number,
  scale: readonly GradeBand[] = DEFAULT_GRADE_SCALE,
): GradeBand {
  const bands = [...scale].sort((a, b) => b.point - a.point);
  return bands.find((b) => gpa >= b.point) ?? bands[bands.length - 1];
}

export function gradeSubject(
  s: SubjectInput,
  scale: readonly GradeBand[] = DEFAULT_GRADE_SCALE,
  passPercent: number = DEFAULT_PASS_PERCENT,
): SubjectResult {
  const failBand = gradeForPercentage(0, scale);
  const isOptional = Boolean(s.isOptional);

  if (s.marks === null || s.fullMarks <= 0) {
    return {
      name: s.name,
      fullMarks: s.fullMarks,
      marks: s.marks,
      percentage: 0,
      grade: failBand.grade,
      gradePoint: failBand.point,
      passed: false,
      isOptional,
    };
  }

  const pct = (s.marks / s.fullMarks) * 100;
  const belowPass = s.passMarks !== undefined ? s.marks < s.passMarks : pct < passPercent;
  const band = gradeForPercentage(pct, scale);
  const passed = !belowPass && band.point > 0;

  return {
    name: s.name,
    fullMarks: s.fullMarks,
    marks: s.marks,
    percentage: round2(pct),
    grade: passed ? band.grade : failBand.grade,
    gradePoint: passed ? band.point : failBand.point,
    passed,
    isOptional,
  };
}

export function computeResult(
  subjects: SubjectInput[],
  options: GradingOptions = {},
): ComputedResult {
  const scale = options.scale ?? DEFAULT_GRADE_SCALE;
  const passPercent = options.passPercent ?? DEFAULT_PASS_PERCENT;
  const maxGpa = Math.max(...scale.map((b) => b.point));

  const rows = subjects.map((s) => gradeSubject(s, scale, passPercent));
  const compulsory = rows.filter((r) => !r.isOptional);

  const total = round2(rows.reduce((sum, r) => sum + (r.marks ?? 0), 0));
  const fullTotal = rows.reduce((sum, r) => sum + r.fullMarks, 0);
  const percentage = fullTotal > 0 ? round2((total / fullTotal) * 100) : 0;

  // Fail any compulsory subject (or absent) => overall fail, GPA 0
  const passed = compulsory.length > 0 && compulsory.every((r) => r.passed);

  let gpa = 0;
  if (passed) {
    const base = compulsory.reduce((sum, r) => sum + r.gradePoint, 0);
    const bonus = rows
      .filter((r) => r.isOptional && r.passed)
      .reduce((sum, r) => sum + Math.max(0, r.gradePoint - OPTIONAL_BASE_POINT), 0);
    gpa = round2(Math.min(maxGpa, (base + bonus) / compulsory.length));
  }

  return {
    subjects: rows,
    total,
    fullTotal,
    percentage,
    gpa,
    grade: gradeForGpa(gpa, scale).grade,
    passed,
  };
    }


// ───────── Pass / fail rules for the school ─────────
// Bangla, English and Maths are COMPULSORY to pass: no override is possible.
// Failing any other (non-optional) subject => a teacher / admin decides:
// "promoted" (বিবেচনায় পাস) or "failed".

const CORE_PATTERNS: readonly RegExp[] = [
  /^(বাংলা(?!দেশ)|bangla|bengali)/i,
  /^(ইংরেজি|ইংলিশ|english)/i,
  /^(গণিত|গনিত|অঙ্ক|অংক|math)/i,
];

export const isCoreSubject = (name: string): boolean => {
  const n = String(name ?? '').trim();
  return CORE_PATTERNS.some((re) => re.test(n));
};

export type PassDecision = 'promoted' | 'failed';

export interface Evaluation {
  passed: boolean;
  /** passed only because a teacher / admin promoted the student */
  promoted: boolean;
  /** a Bangla / English / Maths subject failed — cannot be overridden */
  coreFailed: boolean;
  failedSubjects: string[];
  /** failed only non-core subjects and nobody has decided yet */
  needsDecision: boolean;
  gpa: number;
  grade: string;
}

export function evaluateResult(
  subjects: readonly SubjectResult[],
  decision?: string | null,
  scale: readonly GradeBand[] = DEFAULT_GRADE_SCALE,
): Evaluation {
  const rows = subjects.map((r) => ({ r, core: isCoreSubject(r.name) }));
  const counted = rows.filter((x) => x.core || !x.r.isOptional);

  const coreFailed = rows.some((x) => x.core && !x.r.passed);
  const failedSubjects = counted.filter((x) => !x.r.passed).map((x) => x.r.name);
  const otherFailed = counted.some((x) => !x.core && !x.r.passed);

  const promoted = !coreFailed && otherFailed && decision === 'promoted';
  const passed = !coreFailed && (!otherFailed || promoted);
  const needsDecision = !coreFailed && otherFailed && decision !== 'promoted' && decision !== 'failed';

  let gpa = 0;
  if (passed && counted.length > 0) {
    const maxGpa = Math.max(...scale.map((b) => b.point));
    const base = counted.reduce((sum, x) => sum + x.r.gradePoint, 0);
    const bonus = rows
      .filter((x) => !x.core && x.r.isOptional && x.r.passed)
      .reduce((sum, x) => sum + Math.max(0, x.r.gradePoint - OPTIONAL_BASE_POINT), 0);
    gpa = round2(Math.min(maxGpa, (base + bonus) / counted.length));
  }

  return {
    passed,
    promoted,
    coreFailed,
    failedSubjects,
    needsDecision,
    gpa,
    grade: gradeForGpa(gpa, scale).grade,
  };
   }
