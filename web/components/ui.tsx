import { TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_ICON, STATUS_LABEL } from '@/lib/icons';
import type { RunStatus } from '@/lib/types';

export function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="ibadge" aria-hidden="true">
      <Icon size={18} strokeWidth={1.75} />
    </span>
  );
}

const STATUS_CLASS: Record<RunStatus, string> = { running: 'info', passed: 'ok', failed: 'bad', stopped: 'warn', error: 'warn' };

/** Status is always icon + word, never colour alone. */
export function StatusBadge({ status }: { status: RunStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`badge ${STATUS_CLASS[status]}`}>
      {status === 'running' ? <span className="live-dot" aria-hidden="true" /> : <Icon size={13} aria-hidden="true" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Figures sit together in one hairline-divided strip. */
export function Readout({ children, count }: { children: ReactNode; count: 3 | 5 | 6 }) {
  return (
    <div className="readout">
      <div className="kpis" data-n={count}>{children}</div>
    </div>
  );
}

export function Kpi({ label, value, sub, bad }: { label: string; value: ReactNode; sub?: string; bad?: boolean }) {
  return (
    <div className={`kpi${bad ? ' bad' : ''}`}>
      <div className="l">{bad && <TriangleAlert size={13} aria-label="Needs attention" />}{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export interface SegOption<T extends string> { value: T; label: string; icon?: LucideIcon }

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {Icon && <Icon size={15} aria-hidden="true" />} {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <IconBadge icon={Icon} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
