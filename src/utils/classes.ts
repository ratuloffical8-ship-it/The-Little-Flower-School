// src/utils/classes.ts
/** The school runs Play, Nursery and Class 1–5. */
export const CLASS_LABELS: Record<string, { bn: string; en: string }> = {
  play: { bn: 'প্লে', en: 'Play' },
  nursery: { bn: 'নার্সারি', en: 'Nursery' },
  '1': { bn: 'প্রথম শ্রেণি', en: 'Class 1' },
  '2': { bn: 'দ্বিতীয় শ্রেণি', en: 'Class 2' },
  '3': { bn: 'তৃতীয় শ্রেণি', en: 'Class 3' },
  '4': { bn: 'চতুর্থ শ্রেণি', en: 'Class 4' },
  '5': { bn: 'পঞ্চম শ্রেণি', en: 'Class 5' },
};

export const CLASS_ORDER = ['play', 'nursery', '1', '2', '3', '4', '5'];

export function classLabel(id: string | undefined, isBengali: boolean): string {
  if (!id) return '—';
  const c = CLASS_LABELS[id];
  if (!c) return id;
  return isBengali ? c.bn : c.en;
}
