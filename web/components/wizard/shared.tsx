'use client';

import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { uid, type HeaderRow, type TestForm } from '@/lib/form';

export interface StepProps {
  form: TestForm;
  setForm: Dispatch<SetStateAction<TestForm>>;
}

/** Name and value rows with an on/off switch. Used for global and per-request headers. */
export function HeaderTable({ rows, onChange, label }: { rows: HeaderRow[]; onChange: (rows: HeaderRow[]) => void; label: string }) {
  const patch = (id: string, p: Partial<HeaderRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <div className="stack-sm">
      {rows.length > 0 && (
        <div className="table-wrap stackable">
          <table>
            <thead><tr><th>Name</th><th>Value</th><th>On</th><th><span className="sr-only">Remove</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="full"><span className="cell-label">Name</span><input value={r.k} onChange={(e) => patch(r.id, { k: e.target.value })} aria-label={`${label} name`} spellCheck={false} placeholder="Header-Name" /></td>
                  <td className="full"><span className="cell-label">Value</span><input value={r.v} onChange={(e) => patch(r.id, { v: e.target.value })} aria-label={`${label} value`} spellCheck={false} placeholder="value" /></td>
                  <td className="fit"><span className="cell-label">On</span><input type="checkbox" checked={r.on} onChange={(e) => patch(r.id, { on: e.target.checked })} aria-label={`${label} enabled`} /></td>
                  <td className="action fit"><button type="button" className="btn ghost icon" onClick={() => onChange(rows.filter((x) => x.id !== r.id))} aria-label={`Remove ${label}`}><Trash2 size={16} aria-hidden="true" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div><button type="button" className="btn sm" onClick={() => onChange([...rows, { id: uid(), k: '', v: '', on: true }])}><Plus size={15} aria-hidden="true" /> Add {label.toLowerCase()}</button></div>
    </div>
  );
}

/** Password-style input with a show and hide switch. The value only lives in memory. */
export function SecretInput({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="field">
      {label}
      <span className="input-wrap">
        <input type={shown ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} className="has-trail" />
        <button type="button" className="btn ghost icon trail" onClick={() => setShown((s) => !s)} aria-label={shown ? `Hide ${label}` : `Show ${label}`}>
          {shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}
