// src/features/admin/common/ActionBar.tsx

import { Link } from 'react-router-dom';

export interface ActionItem {
  label: string;
  /** Admin route to open. */
  to: string;
  /** 'primary' renders as the filled button; default is outlined. */
  variant?: 'primary';
}

export interface ActionBarProps {
  title?: string;
  actions: ActionItem[];
}

export default function ActionBar({ title, actions }: ActionBarProps) {
  if (actions.length === 0) return null;

  return (
    <section className="card p-4 sm:p-5">
      {title && <h2 className="mb-3 text-base font-semibold text-navy">{title}</h2>}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) =>
          action.variant === 'primary' ? (
            <Link key={action.to} to={action.to} className="btn-primary">
              {action.label}
            </Link>
          ) : (
            <Link
              key={action.to}
              to={action.to}
              className="rounded-md border border-navy/20 px-4 py-2 text-sm font-medium text-navy hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-royal"
            >
              {action.label}
            </Link>
          ),
        )}
      </div>
    </section>
  );
}
