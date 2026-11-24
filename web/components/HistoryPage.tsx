'use client';

import { ArrowDownRight, ArrowUpRight, GitCompare, History, LoaderCircle, Minus, Rocket, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDateTime, fmtInt, fmtMs, fmtPct } from '@/lib/format';
import { TEST_TYPE_ICON } from '@/lib/icons';
import type { Kpis, RunMeta, RunStatus } from '@/lib/types';
import { useFeedback } from './Feedback';
import { EmptyState, IconBadge, Segmented, StatusBadge } from './ui';

type Filter = 'all' | RunStatus;

const METRICS: { key: keyof Kpis; label: string; fmt: (v: number) => string; lowerIsBetter: boolean | null }[] = [
  { key: 'reqs', label: 'Requests', fmt: fmtInt, lowerIsBetter: null },
  { key: 'rps', label: 'Requests per second', fmt: (v) => v.toFixed(1), lowerIsBetter: false },
  { key: 'failedRate', label: 'Error rate', fmt: fmtPct, lowerIsBetter: true },
  { key: 'avg', label: 'Average response', fmt: fmtMs, lowerIsBetter: true },
  { key: 'p95', label: 'p95 response', fmt: fmtMs, lowerIsBetter: true },
  { key: 'p99', label: 'p99 response', fmt: fmtMs, lowerIsBetter: true }
];

function Compare({ a, b }: { a: RunMeta; b: RunMeta }) {
  const ka = a.kpis;
  const kb = b.kpis;
  if (!ka || !kb) return <p className="muted">One of these runs has no results to compare.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Metric</th><th className="num">A: {a.name}</th><th className="num">B: {b.name}</th><th className="num">Change from A to B</th></tr></thead>
        <tbody>
          {METRICS.map((m) => {
            const va = ka[m.key];
            const vb = kb[m.key];
            const change = va ? ((vb - va) / va) * 100 : 0;
            const same = Math.abs(change) < 1;
            const better = m.lowerIsBetter === null || same ? null : m.lowerIsBetter ? change < 0 : change > 0;
            const Icon = same ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
            return (
              <tr key={m.key}>
                <td>{m.label}</td>
                <td className="num">{m.fmt(va)}</td>
                <td className="num">{m.fmt(vb)}</td>
                <td className={`num delta ${better === null ? '' : better ? 'better' : 'worse'}`}>
                  <span className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                    <Icon size={14} aria-hidden="true" /> {Math.abs(change).toFixed(1)}% {same ? 'about the same' : better === null ? '' : better ? 'better' : 'worse'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function HistoryPage() {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [runs, setRuns] = useState<RunMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<string[]>([]);

  const load = useCallback(() => api.runs().then(setRuns).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => (runs ?? []).filter((r) => filter === 'all' || r.status === filter), [runs, filter]);
  const compare = picked.length === 2 ? picked.map((id) => runs?.find((r) => r.id === id)) : [];

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.slice(-1), id]));

  const remove = async (r: RunMeta) => {
    const ok = await confirm({ title: 'Delete this run?', body: `"${r.name}" and its report will be removed from this computer.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.remove(r.id);
      setPicked((p) => p.filter((x) => x !== r.id));
      toast('Run deleted.');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><History size={14} aria-hidden="true" /> History</div>
          <h1>Past runs</h1>
          <p className="muted">Every test is saved on this computer. Tick two runs to see what changed between them.</p>
        </div>
        <Link href="/new" className="btn primary"><Rocket size={16} aria-hidden="true" /> New test</Link>
      </div>

      {error && <div className="note bad" role="alert">{error}</div>}
      {!runs && !error && <div className="card"><p className="muted"><LoaderCircle size={16} className="spin" aria-hidden="true" /> Loading...</p></div>}

      {runs && runs.length === 0 && (
        <div className="card">
          <EmptyState icon={History} title="Nothing here yet">
            <p>Run your first test and it will appear in this list.</p>
            <Link href="/" className="btn primary"><Rocket size={16} aria-hidden="true" /> Pick a template</Link>
          </EmptyState>
        </div>
      )}

      {runs && runs.length > 0 && (
        <>
          <div className="row between" style={{ marginBottom: 14 }}>
            <Segmented<Filter> label="Filter by result" value={filter} onChange={setFilter}
              options={[{ value: 'all', label: 'All' }, { value: 'passed', label: 'Passed' }, { value: 'failed', label: 'Failed' }, { value: 'stopped', label: 'Stopped' }, { value: 'error', label: 'Errors' }]} />
            <span className="muted small">{picked.length === 2 ? 'Comparing 2 runs' : picked.length === 1 ? 'Pick one more run to compare' : `${visible.length} run${visible.length === 1 ? '' : 's'}`}</span>
          </div>

          <div className="card" style={{ padding: 8 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><span className="sr-only">Select for comparison</span></th>
                    <th>Test</th><th>When</th><th>Target</th>
                    <th className="num">Requests</th><th className="num">Errors</th><th className="num">p95</th>
                    <th>Result</th><th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const Icon = TEST_TYPE_ICON[r.testType];
                    return (
                      <tr key={r.id} className="clickable" onClick={(e) => { if (!(e.target as HTMLElement).closest('input,button,a')) router.push(`/runs/${r.id}`); }}>
                        <td><input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} disabled={!r.kpis} aria-label={`Select ${r.name} from ${fmtDateTime(r.startedAt)} for comparison`} /></td>
                        <td><div className="row" style={{ flexWrap: 'nowrap', gap: 10 }}><IconBadge icon={Icon} tone="ink" small /><Link href={`/runs/${r.id}`}><b>{r.name}</b></Link></div></td>
                        <td className="muted small" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.startedAt)}</td>
                        <td className="mono small">{r.baseUrl.replace(/^https?:\/\//, '')}</td>
                        <td className="num">{r.kpis ? fmtInt(r.kpis.reqs) : '-'}</td>
                        <td className="num">{r.kpis ? fmtPct(r.kpis.failedRate) : '-'}</td>
                        <td className="num">{r.kpis ? fmtMs(r.kpis.p95) : '-'}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td><button type="button" className="btn ghost icon" onClick={() => remove(r)} disabled={r.status === 'running'} aria-label={`Delete ${r.name}`}><Trash2 size={16} aria-hidden="true" /></button></td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (<tr><td colSpan={9} className="muted">No runs match this filter.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          {compare.length === 2 && compare[0] && compare[1] && (
            <section className="card" style={{ marginTop: 18 }} aria-labelledby="cmp-h">
              <div className="row" style={{ marginBottom: 12 }}><GitCompare size={18} aria-hidden="true" /><h2 id="cmp-h">Comparison</h2></div>
              <p className="muted small" style={{ marginBottom: 12 }}>A is {fmtDateTime(compare[0].startedAt)}, B is {fmtDateTime(compare[1].startedAt)}. For response times and errors, lower is better.</p>
              <Compare a={compare[0]} b={compare[1]} />
            </section>
          )}
        </>
      )}
    </>
  );
}
