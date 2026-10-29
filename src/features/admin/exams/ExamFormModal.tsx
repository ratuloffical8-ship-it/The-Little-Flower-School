// src/features/admin/exams/ExamFormModal.tsx
import { useMemo, useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useApi } from '../../../hooks/useApi';

interface ClassOption {
  id: string;
  nameBn: string;
  nameEn: string;
  order?: number;
}

interface ExamSubject {
  name: string;
  fullMarks: number;
  passMarks?: number;
  isOptional?: boolean;
}

interface ExamForEdit {
  id: string;
  name: string;
  classId: string;
  sessionId?: string;
  subjects: ExamSubject[];
}

type Mode = 'create' | 'edit';

interface ExamFormModalProps {
  mode: Mode;
  classes: ClassOption[];
  exam?: ExamForEdit;
  onClose: () => void;
  onSaved: () => void;
}

interface SubjectRow {
  name: string;
  fullMarks: string;
  passMarks: string;
  isOptional: boolean;
}

const EMPTY_SUBJECT: SubjectRow = {
  name: '',
  fullMarks: '100',
  passMarks: '',
  isOptional: false,
};

export default function ExamFormModal({ mode, classes, exam, onClose, onSaved }: ExamFormModalProps) {
  const { isBengali } = useLanguage();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);

  const createApi = useApi<{ success: boolean }>('POST');
  const updateApi = useApi<{ success: boolean }>('PUT');
  const activeApi = mode === 'create' ? createApi : updateApi;

  const [name, setName] = useState(exam?.name ?? '');
  const [classId, setClassId] = useState(exam?.classId ?? '');
  const [subjects, setSubjects] = useState<SubjectRow[]>(
    exam
      ? exam.subjects.map((s) => ({
          name: s.name,
          fullMarks: String(s.fullMarks),
          passMarks: s.passMarks != null ? String(s.passMarks) : '',
          isOptional: !!s.isOptional,
        }))
      : [{ ...EMPTY_SUBJECT }],
  );
  const [error, setError] = useState<string | null>(null);

  const compulsoryCount = useMemo(
    () => subjects.filter((s) => s.name.trim() && !s.isOptional).length,
    [subjects],
  );

  function updateSubject<K extends keyof SubjectRow>(i: number, key: K, value: SubjectRow[K]) {
    setSubjects((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  }

  function addSubject() {
    setSubjects((prev) => [...prev, { ...EMPTY_SUBJECT }]);
  }

  function removeSubject(i: number) {
    setSubjects((prev) => prev.filter((_, idx) => idx !== i));
  }

  function validate(): string | null {
    if (!name.trim()) return tr('পরীক্ষার নাম আবশ্যক।', 'Exam name is required.');
    if (name.trim().length > 80) return tr('নাম ৮০ অক্ষরের মধ্যে হতে হবে।', 'Name must be ≤ 80 chars.');
    if (!classId) return tr('শ্রেণি নির্বাচন করুন।', 'Select a class.');
    const names = new Set<string>();
    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i];
      const n = s.name.trim();
      if (!n) return tr(`বিষয় ${i + 1}: নাম আবশ্যক।`, `Subject ${i + 1}: name is required.`);
      const key = n.toLowerCase();
      if (names.has(key)) return tr(`"${n}" একাধিকবার আছে।`, `"${n}" is duplicated.`);
      names.add(key);
      const full = Number(s.fullMarks);
      if (!Number.isFinite(full) || full <= 0 || full > 1000)
        return tr(
          `বিষয় ${i + 1}: পূর্ণ নম্বর ১–১০০০ হতে হবে।`,
          `Subject ${i + 1}: fullMarks must be 1–1000.`,
        );
      if (s.passMarks.trim()) {
        const pass = Number(s.passMarks);
        if (!Number.isFinite(pass) || pass < 0 || pass > full)
          return tr(
            `বিষয় ${i + 1}: পাস নম্বর ০ থেকে পূর্ণ নম্বরের মধ্যে হতে হবে।`,
            `Subject ${i + 1}: passMarks must be between 0 and fullMarks.`,
          );
      }
    }
    if (compulsoryCount < 1)
      return tr('অন্তত ১টি আবশ্যিক বিষয় দরকার।', 'At least 1 compulsory subject is required.');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    const payloadSubjects = subjects.map((s) => {
      const sub: ExamSubject = { name: s.name.trim(), fullMarks: Number(s.fullMarks) };
      if (s.passMarks.trim()) sub.passMarks = Number(s.passMarks);
      if (s.isOptional) sub.isOptional = true;
      return sub;
    });
    const payload: Record<string, unknown> = { name: name.trim(), subjects: payloadSubjects };
    if (mode === 'create') payload.classId = classId;

    try {
      if (mode === 'create') {
        await createApi.execute('/api/exams', payload);
      } else if (exam) {
        await updateApi.execute(`/api/exams/${exam.id}`, {
          name: name.trim(),
          subjects: payloadSubjects,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('সংরক্ষণ ব্যর্থ হয়েছে।', 'Save failed.'));
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !activeApi.isLoading) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <form onSubmit={handleSubmit} className="card my-8 w-full max-w-3xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">
            {mode === 'create' ? tr('নতুন পরীক্ষা', 'New exam') : tr('পরীক্ষা সম্পাদনা', 'Edit exam')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/50 hover:text-ink"
            aria-label={tr('বন্ধ করুন', 'Close')}
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ex-name">{tr('পরীক্ষার নাম', 'Exam name')} *</label>
            <input
              id="ex-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              maxLength={80}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="ex-class-select">{tr('শ্রেণি', 'Class')} *</label>
            <select
              id="ex-class-select"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="input-field"
              disabled={mode === 'edit'}
              required
            >
              <option value="">{tr('শ্রেণি নির্বাচন করুন', 'Select a class')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {isBengali ? c.nameBn : c.nameEn}
                </option>
              ))}
            </select>
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-ink/60">
                {tr('সম্পাদনার সময় শ্রেণি পরিবর্তন করা যায় না।', 'Class cannot be changed when editing.')}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
              {tr('বিষয়সমূহ', 'Subjects')}
            </h3>
            <button
              type="button"
              onClick={addSubject}
              className="rounded border border-navy/30 px-3 py-1 text-sm text-navy hover:bg-navy/5"
            >
              + {tr('বিষয় যোগ করুন', 'Add subject')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-surface text-left text-ink">
                <tr>
                  <th className="px-3 py-2 font-semibold">{tr('নাম', 'Name')}</th>
                  <th className="px-3 py-2 font-semibold">{tr('পূর্ণ', 'Full')}</th>
                  <th className="px-3 py-2 font-semibold">{tr('পাস', 'Pass')}</th>
                  <th className="px-3 py-2 font-semibold">{tr('ঐচ্ছিক?', 'Optional?')}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => (
                  <tr key={i} className="border-t border-surface">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateSubject(i, 'name', e.target.value)}
                        className="input-field"
                        maxLength={60}
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={s.fullMarks}
                        onChange={(e) => updateSubject(i, 'fullMarks', e.target.value)}
                        className="input-field w-24"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={s.passMarks}
                        onChange={(e) => updateSubject(i, 'passMarks', e.target.value)}
                        className="input-field w-24"
                        placeholder={tr('ডিফল্ট', 'Default')}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={s.isOptional}
                        onChange={(e) => updateSubject(i, 'isOptional', e.target.checked)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeSubject(i)}
                        disabled={subjects.length <= 1}
                        className="text-sm text-red-700 hover:underline disabled:opacity-40"
                      >
                        {tr('সরান', 'Remove')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink/60">
            {tr(
              'পাস নম্বর খালি রাখলে পূর্ণ নম্বরের ৩৩% ধরা হবে।',
              'If pass marks is empty, 33% of fullMarks is used.',
            )}
          </p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-surface pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={activeApi.isLoading}
            className="rounded border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            {tr('বাতিল', 'Cancel')}
          </button>
          <button type="submit" disabled={activeApi.isLoading} className="btn-primary disabled:opacity-50">
            {activeApi.isLoading
              ? tr('সংরক্ষণ হচ্ছে…', 'Saving…')
              : mode === 'create'
                ? tr('তৈরি করুন', 'Create')
                : tr('সংরক্ষণ করুন', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
            }
