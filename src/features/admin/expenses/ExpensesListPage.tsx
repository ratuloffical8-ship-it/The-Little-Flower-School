// src/features/admin/expenses/ExpensesListPage.tsx
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useApiGet } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../hooks/useLanguage';

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
}

interface ListResp {
  items: ExpenseItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

/** Today's date in Bangladesh time (UTC+6) as YYYY-MM-DD */
const todayBdString = (): string =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

function isValidIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function ExpenseFormModal({
  isBengali,
  expense,
  categories,
  onClose,
  onSaved,
}: {
  isBengali: boolean;
  expense?: ExpenseItem;
  categories: string[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const create = useApi<unknown>('POST');
  const update = useApi<unknown>('PUT');

  const [category, setCategory] = useState(expense?.category ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [date, setDate] = useState(expense?.date ?? todayBdString());
  const [description, setDescription] = useState(expense?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!category.trim()) e.category = tr('ক্যাটাগরি আবশ্যক', 'Category is required');
    else if (category.length > 60) e.category = tr('সর্বোচ্চ ৬০ অক্ষর', 'Max 60 characters');
    const n = Number(amount);
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || n < 0.01 || n > 100000000) {
      e.amount = tr('০.০১ থেকে ১০ কোটির মধ্যে (সর্বোচ্চ ২ দশমিক)', 'Between 0.01 and 100,000,000 (max 2 decimals)');
    }
    if (!isValidIsoDate(date)) e.date = tr('সঠিক তারিখ দিন', 'Enter a valid date');
    if (!description.trim()) e.description = tr('বিবরণ আবশ্যক', 'Description is required');
    else if (description.length > 500) e.description = tr('সর্বোচ্চ ৫০০ অক্ষর', 'Max 500 characters');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError('');
    try {
      const body = {
        category: category.trim(),
        amount: Number(amount),
        date,
        description: description.trim(),
      };
      if (expense) await update.execute(`/api/expenses/${expense.id}`, body);
      else await create.execute('/api/expenses', body);
      await onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tr('সংরক্ষণ করা যায়নি', 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !saving && onClose()}
    >
      <form
        className="card relative mx-auto my-6 w-full max-w-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className="flex items-start justify-between">
          <h2 className="section-title">{expense ? tr('খরচ সম্পাদনা', 'Edit Expense') : tr('নতুন খরচ', 'New Expense')}</h2>
          <button type="button" aria-label={tr('বন্ধ', 'Close')} className="text-xl" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ex-cat">{tr('ক্যাটাগরি', 'Category')} *</label>
            <input id="ex-cat" list="ex-cat-list" className="input-field" maxLength={60} value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="ex-cat-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.category && <p className="error-text">{errors.category}</p>}
          </div>
          <div>
            <label className="label" htmlFor="ex-amt">{tr('পরিমাণ (৳)', 'Amount (৳)')} *</label>
            <input id="ex-amt" inputMode="decimal" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {errors.amount && <p className="error-text">{errors.amount}</p>}
          </div>
          <div>
            <label className="label" htmlFor="ex-date">{tr('তারিখ', 'Date')} *</label>
            <input id="ex-date" type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            {errors.date && <p className="error-text">{errors.date}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ex-desc">{tr('বিবরণ', 'Description')} *</label>
            <textarea id="ex-desc" rows={3} className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} />
            {errors.description && <p className="error-text">{errors.description}</p>}
          </div>
        </div>

        {formError && <p className="error-text">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={onClose}>
            {tr('বাতিল', 'Cancel')}
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? tr('সংরক্ষণ হচ্ছে…', 'Saving…') : tr('সংরক্ষণ', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ExpensesListPage() {
  const { isBengali } = useLanguage();
  const { role } = useAuth();
  const tr = (bn: string, en: string) => (isBengali ? bn : en);
  const canDelete = role === 'super_admin' || role === 'school_admin';

  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page') || 1) || 1);
  const category = sp.get('category') || '';
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';

  const [catInput, setCatInput] = useState(category);
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);
  const [filterError, setFilterError] = useState('');

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (category) qs.set('category', category);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const path = `/api/expenses?${qs.toString()}`;

  const { data, isLoading, isWaking, error, execute } = useApiGet<ListResp>(path, [path]);
  const del = useApi<unknown>('DELETE');

  const [modal, setModal] = useState<{ expense?: ExpenseItem } | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseItem | null>(null);
  const [actionError, setActionError] = useState('');

  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSum = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const seenCategories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort();

  const money = (n: number) => `৳ ${Number(n || 0).toLocaleString(isBengali ? 'bn-BD' : 'en-US', { maximumFractionDigits: 2 })}`;

  const applyFilters = (ev: FormEvent) => {
    ev.preventDefault();
    if ((fromInput && !isValidIsoDate(fromInput)) || (toInput && !isValidIsoDate(toInput))) {
      setFilterError(tr('সঠিক তারিখ দিন', 'Enter valid dates'));
      return;
    }
    if (fromInput && toInput && fromInput > toInput) {
      setFilterError(tr('শুরুর তারিখ শেষের তারিখের পরে হতে পারে না', '"From" must not be after "To"'));
      return;
    }
    setFilterError('');
    const next = new URLSearchParams(sp);
    const set = (k: string, v: string) => (v ? next.set(k, v) : next.delete(k));
    set('category', catInput.trim());
    set('from', fromInput);
    set('to', toInput);
    next.delete('page');
    setSp(next);
  };

  const clearFilters = () => {
    setCatInput('');
    setFromInput('');
    setToInput('');
    setFilterError('');
    setSp(new URLSearchParams());
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(sp);
    if (p <= 1) next.delete('page');
    else next.set('page', String(p));
    setSp(next);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setActionError('');
    try {
      await del.execute(`/api/expenses/${toDelete.id}`);
      setToDelete(null);
      await execute();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : tr('মুছে ফেলা যায়নি', 'Could not delete'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">{tr('খরচ ব্যবস্থাপনা', 'Manage Expenses')}</h1>
        <button type="button" className="btn-primary" onClick={() => setModal({})}>
          + {tr('নতুন খরচ', 'New Expense')}
        </button>
      </div>

      {isWaking && (
        <div className="card text-sm text-ink">
          {tr('সার্ভার চালু হচ্ছে, একটু অপেক্ষা করুন…', 'Server is waking up, please wait…')}
        </div>
      )}

      <form className="card flex flex-wrap items-end gap-3" onSubmit={applyFilters}>
        <div>
          <label className="label" htmlFor="ef-cat">{tr('ক্যাটাগরি', 'Category')}</label>
          <input id="ef-cat" list="ef-cat-list" className="input-field" value={catInput} onChange={(e) => setCatInput(e.target.value)} />
          <datalist id="ef-cat-list">
            {seenCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="ef-from">{tr('শুরু', 'From')}</label>
          <input id="ef-from" type="date" className="input-field" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="ef-to">{tr('শেষ', 'To')}</label>
          <input id="ef-to" type="date" className="input-field" value={toInput} onChange={(e) => setToInput(e.target.value)} />
        </div>
        <button type="submit" className="rounded border border-navy/30 px-3 py-2 text-sm">{tr('প্রয়োগ', 'Apply')}</button>
        {(category || from || to) && (
          <button type="button" className="text-sm text-royal underline" onClick={clearFilters}>
            {tr('মুছুন', 'Clear')}
          </button>
        )}
        {filterError && <p className="error-text w-full">{filterError}</p>}
      </form>

      {actionError && <p className="error-text">{actionError}</p>}

      {error && !isLoading && (
        <div className="card">
          <p className="error-text">{tr('খরচ লোড করা যায়নি।', 'Could not load expenses.')}</p>
          <button type="button" className="mt-2 rounded border border-navy/30 px-3 py-1 text-sm" onClick={() => execute()}>
            {tr('আবার চেষ্টা করুন', 'Retry')}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-ink">{tr('লোড হচ্ছে…', 'Loading…')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink">{tr('কোনো খরচ নেই।', 'No expenses found.')}</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-navy">
                <th className="py-2 pr-3">{tr('তারিখ', 'Date')}</th>
                <th className="py-2 pr-3">{tr('ক্যাটাগরি', 'Category')}</th>
                <th className="py-2 pr-3">{tr('বিবরণ', 'Description')}</th>
                <th className="py-2 pr-3 text-right">{tr('পরিমাণ', 'Amount')}</th>
                <th className="py-2 text-right">{tr('কাজ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} className="border-b border-navy/5 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{x.date}</td>
                  <td className="py-2 pr-3">
                    <span className="rounded-full bg-royal/10 px-2 py-0.5 text-xs text-royal">{x.category}</span>
                  </td>
                  <td className="py-2 pr-3 text-ink/80">{x.description || '—'}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{money(x.amount)}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button type="button" className="mr-3 text-royal underline" onClick={() => setModal({ expense: x })}>
                      {tr('সম্পাদনা', 'Edit')}
                    </button>
                    {canDelete && (
                      <button type="button" className="text-red-600 underline" onClick={() => setToDelete(x)}>
                        {tr('মুছুন', 'Delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-3 text-right text-xs text-ink/60">{tr('এই পৃষ্ঠার মোট', 'Total on this page')}</td>
                <td className="pt-3 text-right font-medium text-navy whitespace-nowrap">{money(pageSum)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} className="rounded border border-navy/30 px-3 py-1 disabled:opacity-40" onClick={() => setPage(page - 1)}>
            {tr('আগের', 'Prev')}
          </button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} className="rounded border border-navy/30 px-3 py-1 disabled:opacity-40" onClick={() => setPage(page + 1)}>
            {tr('পরের', 'Next')}
          </button>
        </div>
      )}

      {modal && (
        <ExpenseFormModal
          isBengali={isBengali}
          expense={modal.expense}
          categories={seenCategories}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await execute();
          }}
        />
      )}

      {toDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !del.isLoading && setToDelete(null)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">{tr('খরচটি মুছবেন?', 'Delete this expense?')}</h2>
            <p className="mt-2 text-sm text-ink">
              {toDelete.category} — {money(toDelete.amount)} ({toDelete.date})
            </p>
            <p className="mt-1 text-xs text-ink/60">{tr('এটি ফেরানো যাবে না।', 'This cannot be undone.')}</p>
            {actionError && <p className="error-text mt-2">{actionError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={del.isLoading} className="rounded border border-navy/30 px-4 py-2 text-sm" onClick={() => setToDelete(null)}>
                {tr('বাতিল', 'Cancel')}
              </button>
              <button type="button" disabled={del.isLoading} className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60" onClick={confirmDelete}>
                {del.isLoading ? tr('মুছছে…', 'Deleting…') : tr('মুছুন', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
        }
