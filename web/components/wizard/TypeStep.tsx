'use client';

import { Gauge, Plus, ShieldAlert, SlidersHorizontal, Target, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { LineChart } from '../charts/LineChart';
import { applyTestType, buildRequest, uid, type LoadForm } from '@/lib/form';
import { estimateRun, fmtDur, isHeavy, profilePoints } from '@/lib/format';
import { TEST_TYPE_ICON } from '@/lib/icons';
import { TEST_TYPE_PRESETS, THRESHOLD_METRICS, THRESHOLD_STATS } from '@/lib/presets';
import type { LoadMode, TestType } from '@/lib/types';
import { IconBadge, Segmented, type Tone } from '../ui';
import type { StepProps } from './shared';

const TYPE_TONE: Record<string, Tone> = { smoke: 'amber', load: 'ink', stress: 'red', spike: 'grey', soak: 'grey', custom: 'green' };
const OPS = ['<', '<=', '>', '>=', '=='];

const MODE_OPTIONS: { value: LoadMode; label: string }[] = [
  { value: 'iterations', label: 'Quick pass' },
  { value: 'simple', label: 'Fixed users' },
  { value: 'stages', label: 'Ramp in stages' },
  { value: 'rate', label: 'Fixed rate' }
];

export function TypeStep({ form, setForm }: StepProps) {
  const request = useMemo(() => buildRequest(form), [form]);
  const est = useMemo(() => estimateRun(request.config), [request]);
  const heavy = useMemo(() => isHeavy(request.config), [request]);
  const points = useMemo(() => profilePoints(request.config), [request]);

  // Any hand edit of load or thresholds turns the type into "custom".
  const setLoad = (p: Partial<LoadForm>) => setForm((f) => ({ ...f, testType: 'custom', load: { ...f.load, ...p } }));
  const pickType = (t: TestType) => setForm((f) => applyTestType(f, t));
  const load = form.load;

  const patchStage = (id: string, p: Partial<LoadForm['stages'][number]>) =>
    setLoad({ stages: load.stages.map((s) => (s.id === id ? { ...s, ...p } : s)) });

  return (
    <div className="stack">
      <section className="card" aria-labelledby="y-type">
        <div className="row" style={{ marginBottom: 16 }}>
          <IconBadge icon={Target} tone="red" />
          <div><h2 id="y-type">What kind of test?</h2><p className="muted small">Each type fills in sensible users, duration and pass or fail rules. You can edit everything below.</p></div>
        </div>
        <div className="type-grid">
          {TEST_TYPE_PRESETS.map((p) => {
            const Icon = TEST_TYPE_ICON[p.id];
            return (
              <button key={p.id} type="button" className="type-card" aria-pressed={form.testType === p.id} onClick={() => pickType(p.id)}>
                <IconBadge icon={Icon} tone={TYPE_TONE[p.id]} small />
                <b>{p.label}</b>
                <span>{p.tagline}</span>
              </button>
            );
          })}
          <div className="type-card" aria-pressed={form.testType === 'custom'} style={{ cursor: 'default' }}>
            <IconBadge icon={SlidersHorizontal} tone="green" small />
            <b>Custom</b>
            <span>{form.testType === 'custom' ? 'You changed the settings.' : 'Edit anything below.'}</span>
          </div>
        </div>
        {form.testType !== 'custom' && (
          <p className="muted small" style={{ marginTop: 12 }}>{TEST_TYPE_PRESETS.find((p) => p.id === form.testType)?.detail}</p>
        )}
      </section>

      <section className="card" aria-labelledby="y-load">
        <div className="row" style={{ marginBottom: 16 }}>
          <IconBadge icon={Gauge} tone="ink" />
          <div><h2 id="y-load">Load</h2><p className="muted small">How many virtual users, and for how long.</p></div>
        </div>
        <div className="stack">
          <Segmented<LoadMode> label="Load shape" value={load.mode} options={MODE_OPTIONS} onChange={(mode) => setLoad({ mode, stages: mode === 'stages' && load.stages.length === 0 ? [{ id: uid(), duration: '30s', target: 5 }, { id: uid(), duration: '1m', target: 5 }, { id: uid(), duration: '30s', target: 0 }] : load.stages })} />

          {load.mode === 'iterations' && (
            <div className="row end">
              <label className="field" style={{ width: 170 }}>Virtual users<input type="number" min={1} max={500} value={load.vus} onChange={(e) => setLoad({ vus: Number(e.target.value) })} /></label>
              <label className="field" style={{ width: 170 }}>Total iterations<input type="number" min={1} value={load.iterations} onChange={(e) => setLoad({ iterations: Number(e.target.value) })} /></label>
              <p className="hint grow">An iteration runs all your requests once. Good for a quick check.</p>
            </div>
          )}

          {load.mode === 'simple' && (
            <div className="row end">
              <label className="field" style={{ width: 170 }}>Virtual users<input type="number" min={1} max={500} value={load.vus} onChange={(e) => setLoad({ vus: Number(e.target.value) })} /></label>
              <label className="field" style={{ width: 170 }}>Duration<input value={load.duration} onChange={(e) => setLoad({ duration: e.target.value })} spellCheck={false} /><span className="hint">30s, 5m, 1h</span></label>
            </div>
          )}

          {load.mode === 'rate' && (
            <div className="row end">
              <label className="field" style={{ width: 200 }}>Iterations per second<input type="number" min={1} max={1000} value={load.rate} onChange={(e) => setLoad({ rate: Number(e.target.value) })} /></label>
              <label className="field" style={{ width: 170 }}>Duration<input value={load.duration} onChange={(e) => setLoad({ duration: e.target.value })} spellCheck={false} /></label>
              <p className="hint grow">k6 adds users as needed to hold this rate, which shows clearly when the API cannot keep up.</p>
            </div>
          )}

          {load.mode === 'stages' && (
            <div className="stack-sm">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Duration</th><th>Target users</th><th><span className="sr-only">Remove</span></th></tr></thead>
                  <tbody>
                    {load.stages.map((s, i) => (
                      <tr key={s.id}>
                        <td className="muted">{i + 1}</td>
                        <td><input value={s.duration} onChange={(e) => patchStage(s.id, { duration: e.target.value })} aria-label={`Stage ${i + 1} duration`} spellCheck={false} /></td>
                        <td><input type="number" min={0} max={500} value={s.target} onChange={(e) => patchStage(s.id, { target: Number(e.target.value) })} aria-label={`Stage ${i + 1} target users`} /></td>
                        <td><button type="button" className="btn ghost icon" onClick={() => setLoad({ stages: load.stages.filter((x) => x.id !== s.id) })} aria-label={`Remove stage ${i + 1}`}><Trash2 size={16} aria-hidden="true" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div><button type="button" className="btn sm" onClick={() => setLoad({ stages: [...load.stages, { id: uid(), duration: '30s', target: 5 }] })}><Plus size={15} aria-hidden="true" /> Add stage</button></div>
            </div>
          )}

          <label className="field" style={{ maxWidth: 300 }}>Pause between requests (seconds)
            <input type="number" min={0} max={60} step={0.5} value={load.think} onChange={(e) => setLoad({ think: Number(e.target.value) })} />
            <span className="hint">0 sends requests back to back. A real user usually waits 1 to 3 seconds.</span>
          </label>

          {heavy && (
            <div className="note warn">
              <ShieldAlert size={17} aria-hidden="true" />
              <span>This sends a lot of traffic (about {Math.round(est.approxRequests).toLocaleString('en-US')} requests, up to {est.peakVus} users). Only run it against an API you own or have permission to test.</span>
            </div>
          )}

          <div className="card flat">
            <div className="row between" style={{ marginBottom: 6 }}>
              <h3>{load.mode === 'rate' ? 'Iterations per second over time' : 'Virtual users over time'}</h3>
              <span className="muted small">About {fmtDur(est.secs)}</span>
            </div>
            <LineChart label="Planned load over time" series={[{ name: load.mode === 'rate' ? 'Iterations per second' : 'Virtual users', data: points, area: true }]} height={200} />
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="y-thr">
        <div className="row between" style={{ marginBottom: 6 }}>
          <div><h2 id="y-thr">Pass or fail rules</h2><p className="muted small" style={{ marginTop: 4 }}>If any rule is broken, the whole test is marked failed.</p></div>
        </div>
        <div className="stack">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Metric</th><th>Measure</th><th>Rule</th><th>Value</th><th title="Stop the test as soon as this rule fails">Stop early</th><th><span className="sr-only">Remove</span></th></tr></thead>
              <tbody>
                {form.thresholds.map((t) => {
                  const patch = (p: Partial<typeof t>) => setForm((f) => ({ ...f, testType: 'custom', thresholds: f.thresholds.map((x) => (x.id === t.id ? { ...x, ...p } : x)) }));
                  return (
                    <tr key={t.id}>
                      <td><select value={t.metric} onChange={(e) => patch({ metric: e.target.value })} aria-label="Metric">{THRESHOLD_METRICS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}</select></td>
                      <td><select value={t.stat} onChange={(e) => patch({ stat: e.target.value })} aria-label="Measure">{THRESHOLD_STATS.map((s) => (<option key={s}>{s}</option>))}</select></td>
                      <td><select value={t.op} onChange={(e) => patch({ op: e.target.value })} aria-label="Rule">{OPS.map((o) => (<option key={o}>{o}</option>))}</select></td>
                      <td><input type="number" step="any" value={t.value} onChange={(e) => patch({ value: Number(e.target.value) })} aria-label="Value" style={{ minWidth: 90 }} /></td>
                      <td><input type="checkbox" checked={t.abort} onChange={(e) => patch({ abort: e.target.checked })} aria-label="Stop the test early if this fails" /></td>
                      <td><button type="button" className="btn ghost icon" onClick={() => setForm((f) => ({ ...f, testType: 'custom', thresholds: f.thresholds.filter((x) => x.id !== t.id) }))} aria-label="Remove rule"><Trash2 size={16} aria-hidden="true" /></button></td>
                    </tr>
                  );
                })}
                {form.thresholds.length === 0 && (<tr><td colSpan={6} className="muted">No rules. The test will always pass unless k6 itself fails.</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="row between">
            <button type="button" className="btn sm" onClick={() => setForm((f) => ({ ...f, testType: 'custom', thresholds: [...f.thresholds, { id: uid(), metric: 'http_req_duration', stat: 'p(95)', op: '<', value: 1000, abort: false }] }))}><Plus size={15} aria-hidden="true" /> Add rule</button>
            <p className="hint">Times are in milliseconds. For rates, 0.01 means 1%.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
