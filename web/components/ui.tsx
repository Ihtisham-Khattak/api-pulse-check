import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_ICON, STATUS_LABEL } from '@/lib/icons';
import type { RunStatus } from '@/lib/types';

export type Tone = 'green' | 'ink' | 'amber' | 'red' | 'grey';

export function IconBadge({ icon: Icon, tone, small }: { icon: LucideIcon; tone: Tone; small?: boolean }) {
  return (
    <span className={`ibadge tone-${tone}${small ? ' sm' : ''}`} aria-hidden="true">
      <Icon size={small ? 17 : 21} strokeWidth={2} />
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

export function Kpi({ icon, tone, label, value, sub }: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="kpi">
      <IconBadge icon={icon} tone={tone} small />
      <div>
        <div className="l">{label}</div>
        <div className="v">{value}</div>
        {sub && <div className="s">{sub}</div>}
      </div>
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
      <IconBadge icon={Icon} tone="ink" />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
