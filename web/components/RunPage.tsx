'use client';

import { Activity, Gauge, History, LoaderCircle, OctagonX, SearchX, TriangleAlert, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDur, fmtInt, fmtMs, fmtPct } from '@/lib/format';
import type { RunMeta, RunResult, RunSnapshot, Sample } from '@/lib/types';
import { LineChart } from './charts/LineChart';
import { useFeedback } from './Feedback';
import { ResultView } from './ResultView';
import { EmptyState, Kpi, StatusBadge } from './ui';

const MAX_LOG = 300;

function LiveView({ live, onStop, stopping }: { live: RunSnapshot; onStop: () => void; stopping: boolean }) {
  const logRef = useRef<HTMLDivElement>(null);
  const last: Sample | undefined = live.series[live.series.length - 1];
  const elapsed = last?.t ?? 0;
  const expected = live.meta.expectedSecs;
  const pct = expected > 0 ? Math.min(99, (elapsed / expected) * 100) : 0;
  const finishing = expected > 0 && elapsed > expected + 3;
  const errRate = live.totals.reqs ? live.totals.failed / live.totals.reqs : 0;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [live.log.length]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="row" style={{ marginBottom: 8 }}><StatusBadge status="running" /></div>
          <h1>{live.meta.name}</h1>
          <p className="muted"><span className="mono">{live.meta.baseUrl}</span></p>
        </div>
        <button type="button" className="btn danger" onClick={onStop} disabled={stopping}>
          {stopping ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <OctagonX size={16} aria-hidden="true" />} {stopping ? 'Stopping...' : 'Stop test'}
        </button>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="small muted">{finishing ? 'Finishing up and writing the report...' : `${fmtDur(elapsed)} of about ${fmtDur(expected)}`}</span>
          <span className="small muted">{Math.round(pct)}%</span>
        </div>
        <div className={`progress${finishing ? ' indeterminate' : ''}`} role="progressbar" aria-label="Test progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="kpis">
        <Kpi icon={Users} tone="ink" label="Virtual users" value={last ? Math.round(last.vus) : 0} />
        <Kpi icon={Zap} tone="grey" label="Requests / sec" value={last ? last.rps.toFixed(1) : '0.0'} />
        <Kpi icon={Activity} tone="grey" label="Requests so far" value={fmtInt(live.totals.reqs)} />
        <Kpi icon={Gauge} tone="amber" label="p95 latency" value={last ? fmtMs(last.p95) : '-'} />
        <Kpi icon={TriangleAlert} tone={errRate > 0 ? 'red' : 'green'} label="Error rate" value={fmtPct(errRate)} />
      </div>

      <div className="chart-grid">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Response time</h3>
          <LineChart label="Live response time" yFmt={fmtMs} xMax={Math.max(expected, elapsed, 5)}
            series={[{ name: 'Average', data: live.series.map((s) => ({ x: s.t, y: s.avg })), area: true }, { name: 'p95', data: live.series.map((s) => ({ x: s.t, y: s.p95 })) }]} />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Users and throughput</h3>
          <LineChart label="Live virtual users and requests per second" xMax={Math.max(expected, elapsed, 5)}
            series={[{ name: 'Virtual users', data: live.series.map((s) => ({ x: s.t, y: s.vus })), area: true }, { name: 'Requests per second', data: live.series.map((s) => ({ x: s.t, y: s.rps })) }]} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>k6 output</h3>
        <div className="log" ref={logRef} role="log" aria-label="k6 output">{live.log.join('\n')}</div>
      </div>
    </>
  );
}

export function RunPage({ id }: { id: string }) {
  const { toast } = useFeedback();
  const [result, setResult] = useState<RunResult | null>(null);
  const [live, setLive] = useState<RunSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  const load = useCallback(() => api.run(id).then((r) => { setResult(r); return r; }), [id]);

  useEffect(() => {
    let alive = true;
    let es: EventSource | null = null;

    const connect = () => {
      es = new EventSource(`/api/runs/${id}/events`);
      es.addEventListener('snapshot', (ev) => { if (alive) setLive(JSON.parse((ev as MessageEvent).data) as RunSnapshot); });
      es.addEventListener('sample', (ev) => {
        const d = JSON.parse((ev as MessageEvent).data) as { sample: Sample; totals: RunSnapshot['totals'] };
        if (alive) setLive((p) => (p ? { ...p, series: [...p.series, d.sample], totals: d.totals } : p));
      });
      es.addEventListener('log', (ev) => {
        const d = JSON.parse((ev as MessageEvent).data) as { line: string };
        if (alive) setLive((p) => (p ? { ...p, log: [...p.log, d.line].slice(-MAX_LOG) } : p));
      });
      es.addEventListener('done', (ev) => {
        es?.close();
        const d = JSON.parse((ev as MessageEvent).data) as { meta: RunMeta | null };
        if (!alive) return;
        setStopping(false);
        load().then(() => { if (alive) setLive(null); }).catch((e: Error) => { if (alive) setError(e.message); });
        if (d.meta?.status === 'stopped') toast('The test was stopped.');
      });
      es.onerror = () => {
        // The browser retries on its own. If the server is gone for good we stop after a while.
        window.setTimeout(() => { if (alive && es && es.readyState === EventSource.CLOSED) setError('Lost the connection to the Pulsar server.'); }, 4000);
      };
    };

    load()
      .then((r) => { if (alive && r.meta.status === 'running') connect(); })
      .catch((e: Error) => { if (alive) setError(e.message); });

    return () => { alive = false; es?.close(); };
  }, [id, load, toast]);

  // Safety net: if the live stream is slow to connect, or the run ends while we wait, keep checking.
  useEffect(() => {
    if (!result || result.meta.status !== 'running' || live) return;
    const timer = window.setInterval(() => { load().catch(() => {}); }, 2000);
    return () => window.clearInterval(timer);
  }, [result, live, load]);

  const stop = async () => {
    setStopping(true);
    try { await api.stop(id); } catch (e) { setStopping(false); toast((e as Error).message, 'error'); }
  };

  if (error && !result) {
    return (
      <div className="card">
        <EmptyState icon={SearchX} title="Could not open this run">
          <p>{error}</p>
          <Link className="btn" href="/history"><History size={16} aria-hidden="true" /> Back to history</Link>
        </EmptyState>
      </div>
    );
  }
  if (!result) return <div className="card"><p className="muted"><LoaderCircle size={16} className="spin" aria-hidden="true" /> Loading...</p></div>;
  if (live && result.meta.status === 'running') return <LiveView live={live} onStop={stop} stopping={stopping} />;
  if (result.meta.status === 'running') return <div className="card"><p className="muted"><LoaderCircle size={16} className="spin" aria-hidden="true" /> Connecting to the live run...</p></div>;
  return <ResultView result={result} />;
}
