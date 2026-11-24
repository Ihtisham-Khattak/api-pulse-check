'use client';

import {
  ArrowDown, ArrowUp, Braces, CircleCheck, CircleX, Copy, Database, ListChecks, Plus, Save, Trash2, TriangleAlert, Variable, Wand2
} from 'lucide-react';
import { useMemo, useRef } from 'react';
import { newStep, parseDataText, uid, type StepForm } from '@/lib/form';
import { repeatedBasePath } from '@/lib/format';
import { METHODS } from '@/lib/validate';
import type { CheckType, DataMode, Method } from '@/lib/types';
import { IconBadge } from '../ui';
import { HeaderTable, type StepProps } from './shared';

const CHECK_LABELS: Record<CheckType, string> = {
  status: 'Status code equals',
  json: 'JSON field equals',
  exists: 'JSON field exists',
  contains: 'Body contains text',
  time: 'Responds under (ms)'
};

const BUILTIN_VARS = ['{{$randomInt}}', '{{$uuid}}', '{{$timestamp}}', '{{$randomEmail}}'];

function bodyProblem(body: string): string | null {
  if (!body.trim()) return null;
  try {
    JSON.parse(body.replace(/\{\{[^}]+\}\}/g, '1'));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Not valid JSON';
  }
}

export function RequestsStep({ form, setForm, selId, setSelId }: StepProps & { selId: string; setSelId: (id: string) => void }) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const sel = form.steps.find((s) => s.id === selId) ?? form.steps[0];
  const selIndex = sel ? form.steps.findIndex((s) => s.id === sel.id) : -1;
  const parsedData = useMemo(() => parseDataText(form.dataText), [form.dataText]);

  const patch = (id: string, p: Partial<StepForm>) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s) => (s.id === id ? { ...s, ...p } : s)) }));

  const addStep = () => {
    const s = newStep({ name: `Request ${form.steps.length + 1}`, path: '/' });
    setForm((f) => ({ ...f, steps: [...f.steps, s] }));
    setSelId(s.id);
  };

  const move = (dir: -1 | 1) => {
    const i = selIndex + dir;
    if (i < 0 || i >= form.steps.length) return;
    setForm((f) => {
      const steps = [...f.steps];
      [steps[selIndex], steps[i]] = [steps[i], steps[selIndex]];
      return { ...f, steps };
    });
  };

  const duplicate = () => {
    if (!sel) return;
    const copy: StepForm = {
      ...sel, id: uid(), name: sel.name + ' copy',
      headers: sel.headers.map((h) => ({ ...h, id: uid() })),
      extract: sel.extract.map((e) => ({ ...e, id: uid() })),
      checks: sel.checks.map((c) => ({ ...c, id: uid() }))
    };
    setForm((f) => {
      const steps = [...f.steps];
      steps.splice(selIndex + 1, 0, copy);
      return { ...f, steps };
    });
    setSelId(copy.id);
  };

  const remove = () => {
    if (!sel || form.steps.length <= 1) return;
    const rest = form.steps.filter((s) => s.id !== sel.id);
    setForm((f) => ({ ...f, steps: rest }));
    setSelId(rest[Math.max(0, selIndex - 1)].id);
  };

  const insertIntoBody = (text: string) => {
    if (!sel) return;
    const el = bodyRef.current;
    const start = el?.selectionStart ?? sel.body.length;
    const end = el?.selectionEnd ?? sel.body.length;
    patch(sel.id, { body: sel.body.slice(0, start) + text + sel.body.slice(end) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + text.length, start + text.length); });
  };

  const formatBody = () => {
    if (!sel) return;
    try {
      const parsed = JSON.parse(sel.body.replace(/"(\{\{[^}]+\}\})"/g, '"$1"'));
      patch(sel.id, { body: JSON.stringify(parsed, null, 2) });
    } catch { /* leave as is; the validity message already explains the problem */ }
  };

  const savedVars = sel ? form.steps.slice(0, selIndex).flatMap((s) => s.extract.map((e) => `{{vars.${e.name}}}`)) : [];
  const dataVars = parsedData.columns.map((c) => `{{data.${c}}}`);
  const hasBody = sel && sel.method !== 'GET' && sel.method !== 'DELETE';
  const problem = sel ? bodyProblem(sel.body) : null;

  return (
    <div className="stack">
      <section className="card" aria-labelledby="r-title">
        <div className="row between" style={{ marginBottom: 16 }}>
          <div className="row">
            <IconBadge icon={Braces} tone="ink" />
            <div><h2 id="r-title">Requests</h2><p className="muted small">Each virtual user runs these top to bottom, then starts again. One request is fine.</p></div>
          </div>
          <button type="button" className="btn sm" onClick={addStep}><Plus size={15} aria-hidden="true" /> Add request</button>
        </div>

        <div className="row" style={{ alignItems: 'flex-start', gap: 18 }}>
          <div className="step-list" style={{ flex: '1 1 230px', maxWidth: 300 }}>
            {form.steps.map((s, i) => (
              <button key={s.id} type="button" className="step-item" aria-pressed={sel?.id === s.id} onClick={() => setSelId(s.id)}>
                <span className="n">{i + 1}</span>
                <span className="t"><b>{s.name || 'Untitled'}</b><span>{s.path || '/'}</span></span>
                <span className={`method ${s.method}`}>{s.method}</span>
              </button>
            ))}
          </div>

          {sel && (
            <div className="stack" style={{ flex: '3 1 380px', minWidth: 0 }}>
              <div className="row between">
                <h3>Request {selIndex + 1} of {form.steps.length}</h3>
                <div className="row" style={{ gap: 4 }}>
                  <button type="button" className="btn ghost icon" onClick={() => move(-1)} disabled={selIndex === 0} aria-label="Move request up"><ArrowUp size={16} aria-hidden="true" /></button>
                  <button type="button" className="btn ghost icon" onClick={() => move(1)} disabled={selIndex === form.steps.length - 1} aria-label="Move request down"><ArrowDown size={16} aria-hidden="true" /></button>
                  <button type="button" className="btn ghost icon" onClick={duplicate} aria-label="Duplicate request"><Copy size={16} aria-hidden="true" /></button>
                  <button type="button" className="btn ghost icon" onClick={remove} disabled={form.steps.length <= 1} aria-label="Delete request"><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              </div>

              <label className="field">Name
                <input value={sel.name} onChange={(e) => patch(sel.id, { name: e.target.value })} maxLength={60} />
              </label>

              <div className="row end">
                <label className="field" style={{ width: 130 }}>Method
                  <select value={sel.method} onChange={(e) => patch(sel.id, { method: e.target.value as Method })}>
                    {METHODS.map((m) => (<option key={m}>{m}</option>))}
                  </select>
                </label>
                <label className="field grow">Path
                  <input value={sel.path} onChange={(e) => patch(sel.id, { path: e.target.value })} spellCheck={false} placeholder="/api/orders" />
                </label>
              </div>
              <p className="hint mono" style={{ marginTop: -6, overflowWrap: 'anywhere' }}>{sel.method} {form.baseUrl.replace(/\/+$/, '')}{sel.path}</p>
              {repeatedBasePath(form.baseUrl, sel.path) && (
                <div className="note warn" role="alert">
                  <TriangleAlert size={17} aria-hidden="true" />
                  <div className="stack-sm">
                    <span>Your Base URL already ends with <b className="mono">{repeatedBasePath(form.baseUrl, sel.path)}</b>, and the path starts with it too. The request would go to <span className="mono" style={{ overflowWrap: 'anywhere' }}>{form.baseUrl.replace(/\/+$/, '')}{sel.path}</span>, which usually does not exist (HTTP 404).</span>
                    <div>
                      <button type="button" className="btn sm" onClick={() => {
                        const rest = sel.path.trim().slice((repeatedBasePath(form.baseUrl, sel.path) ?? '').length);
                        patch(sel.id, { path: rest.startsWith('/') ? rest : '/' + rest });
                      }}>Remove the repeated part from the path</button>
                    </div>
                  </div>
                </div>
              )}

              {form.auth.type !== 'none' && (
                <label className="check-row"><input type="checkbox" checked={sel.useAuth} onChange={(e) => patch(sel.id, { useAuth: e.target.checked })} /> Send authentication with this request</label>
              )}

              {hasBody && (
                <div className="stack-sm">
                  <label className="field">Payload (JSON body)
                    <textarea ref={bodyRef} rows={9} value={sel.body} onChange={(e) => patch(sel.id, { body: e.target.value })} spellCheck={false} placeholder={'{\n  "name": "Example"\n}'} aria-invalid={problem ? true : undefined} />
                  </label>
                  <div className="row">
                    {problem
                      ? <span className="validity bad"><CircleX size={15} aria-hidden="true" /> {problem}</span>
                      : sel.body.trim() ? <span className="validity ok"><CircleCheck size={15} aria-hidden="true" /> Valid JSON</span> : <span className="muted small">No payload</span>}
                    <button type="button" className="btn sm" onClick={formatBody} disabled={!!problem || !sel.body.trim()}><Wand2 size={14} aria-hidden="true" /> Format</button>
                  </div>
                  <div>
                    <div className="muted small" style={{ marginBottom: 6 }}>Click to insert a value that changes on every request:</div>
                    <div className="chips">
                      {[...BUILTIN_VARS, ...dataVars, ...savedVars].map((v) => (<button type="button" key={v} className="chip" onClick={() => insertIntoBody(v)}>{v}</button>))}
                    </div>
                  </div>
                </div>
              )}

              <details>
                <summary>Extra headers for this request{sel.headers.length ? ` (${sel.headers.length})` : ''}</summary>
                <div style={{ marginTop: 10 }}><HeaderTable rows={sel.headers} onChange={(headers) => patch(sel.id, { headers })} label="Header" /></div>
              </details>

              <div>
                <div className="section-label"><Save size={16} aria-hidden="true" /><h3>Save values from the response</h3></div>
                <p className="hint" style={{ marginBottom: 8 }}>Keep a token or an id and use it in later requests as <span className="mono">{'{{vars.name}}'}</span>.</p>
                {sel.extract.map((ex) => (
                  <div className="mini-row two" key={ex.id} style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr) auto' }}>
                    <input value={ex.name} onChange={(e) => patch(sel.id, { extract: sel.extract.map((x) => (x.id === ex.id ? { ...x, name: e.target.value } : x)) })} aria-label="Variable name" placeholder="name" spellCheck={false} />
                    <input value={ex.path} onChange={(e) => patch(sel.id, { extract: sel.extract.map((x) => (x.id === ex.id ? { ...x, path: e.target.value } : x)) })} aria-label="Where in the response" placeholder="$.data.id" spellCheck={false} />
                    <button type="button" className="btn ghost icon" onClick={() => patch(sel.id, { extract: sel.extract.filter((x) => x.id !== ex.id) })} aria-label="Remove saved value"><Trash2 size={16} aria-hidden="true" /></button>
                  </div>
                ))}
                <button type="button" className="btn sm" onClick={() => patch(sel.id, { extract: [...sel.extract, { id: uid(), name: 'id', path: '$.id' }] })}><Plus size={15} aria-hidden="true" /> Save a value</button>
              </div>

              <div>
                <div className="section-label"><ListChecks size={16} aria-hidden="true" /><h3>Checks</h3></div>
                <p className="hint" style={{ marginBottom: 8 }}>What must be true for the response to count as correct. This is how you verify the data your API returns.</p>
                {sel.checks.map((c) => (
                  <div className="mini-row check" key={c.id}>
                    <select value={c.type} onChange={(e) => patch(sel.id, { checks: sel.checks.map((x) => (x.id === c.id ? { ...x, type: e.target.value as CheckType, path: e.target.value === 'json' || e.target.value === 'exists' ? (x.path ?? '$.') : undefined } : x)) })} aria-label="Check type">
                      {(Object.keys(CHECK_LABELS) as CheckType[]).map((t) => (<option key={t} value={t}>{CHECK_LABELS[t]}</option>))}
                    </select>
                    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      {(c.type === 'json' || c.type === 'exists') && (
                        <input value={c.path ?? ''} onChange={(e) => patch(sel.id, { checks: sel.checks.map((x) => (x.id === c.id ? { ...x, path: e.target.value } : x)) })} aria-label="JSON path" placeholder="$.field" spellCheck={false} />
                      )}
                      {c.type !== 'exists' && (
                        <input value={c.value ?? ''} onChange={(e) => patch(sel.id, { checks: sel.checks.map((x) => (x.id === c.id ? { ...x, value: e.target.value } : x)) })} aria-label="Expected value" placeholder={c.type === 'status' ? '200' : 'expected'} spellCheck={false} />
                      )}
                    </div>
                    <button type="button" className="btn ghost icon" onClick={() => patch(sel.id, { checks: sel.checks.filter((x) => x.id !== c.id) })} aria-label="Remove check"><Trash2 size={16} aria-hidden="true" /></button>
                  </div>
                ))}
                <button type="button" className="btn sm" onClick={() => patch(sel.id, { checks: [...sel.checks, { id: uid(), type: 'status', value: '200' }] })}><Plus size={15} aria-hidden="true" /> Add check</button>
              </div>

              <label className="field" style={{ maxWidth: 260 }}>Wait after this request (seconds)
                <input type="number" min={0} max={60} step={0.5} value={sel.think} onChange={(e) => patch(sel.id, { think: e.target.value })} placeholder={`default (${form.load.think})`} />
                <span className="hint">Leave empty to use the pause chosen in step 3.</span>
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="card" aria-labelledby="r-data">
        <div className="row" style={{ marginBottom: 14 }}>
          <IconBadge icon={Database} tone="green" />
          <div><h2 id="r-data">Test data <span className="badge">Optional</span></h2><p className="muted small">Send different values on each iteration, for example many emails or ids.</p></div>
        </div>
        <div className="stack">
          <label className="field">Paste CSV or JSON
            <textarea rows={6} value={form.dataText} onChange={(e) => setForm((f) => ({ ...f, dataText: e.target.value }))} spellCheck={false} placeholder={'email,password\nanna@example.com,secret1\nben@example.com,secret2'} />
            <span className="hint">CSV needs a header line. JSON must be a list of objects. Use the columns as <span className="mono">{'{{data.email}}'}</span> in paths, payloads and checks.</span>
          </label>
          {parsedData.error && <span className="validity bad"><CircleX size={15} aria-hidden="true" /> {parsedData.error}</span>}
          {!parsedData.error && parsedData.rows.length > 0 && (
            <div className="row">
              <span className="validity ok"><CircleCheck size={15} aria-hidden="true" /> {parsedData.rows.length} rows, columns:</span>
              <span className="chips">{parsedData.columns.map((c) => (<span key={c} className="chip" style={{ cursor: 'default' }}><Variable size={11} aria-hidden="true" /> {c}</span>))}</span>
            </div>
          )}
          {parsedData.rows.length > 0 && (
            <label className="field" style={{ maxWidth: 320 }}>How to pick a row
              <select value={form.dataMode} onChange={(e) => setForm((f) => ({ ...f, dataMode: e.target.value as DataMode }))}>
                <option value="sequential">In order, one row per iteration</option>
                <option value="random">Random row each time</option>
                <option value="per-vu">One fixed row per virtual user</option>
              </select>
            </label>
          )}
        </div>
      </section>
    </div>
  );
}
