'use client';

import {
  Activity, CircleCheck, CircleX, FileJson, FileText, Gauge, Info, OctagonX, RotateCcw, Timer, TriangleAlert, Zap
} from 'lucide-react';
import Link from 'next/link';
import { fmtDateTime, fmtDur, fmtInt, fmtMs, fmtPct } from '@/lib/format';
import type { RunResult, ThresholdResult } from '@/lib/types';
import { LineChart } from './charts/LineChart';
import { Kpi, StatusBadge } from './ui';

function fmtThr(metric: string, v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '-';
  if (metric === 'http_req_failed' || metric === 'checks') return fmtPct(v);
  if (metric === 'http_reqs') return fmtInt(v);
  return fmtMs(v);
}

function describe(t: ThresholdResult): string {
  return `${t.metric} ${t.stat} ${t.op} ${fmtThr(t.metric, t.limit)} (was ${fmtThr(t.metric, t.actual)})`;
}

export function ResultView({ result }: { result: RunResult }) {
  const { meta, config, thresholds, checks, series } = result;
  const k = meta.kpis;
  const failedRules = thresholds.filter((t) => !t.ok);
  const p95Rule = thresholds.find((t) => t.metric === 'http_req_duration' && t.stat === 'p(95)' && (t.op === '<' || t.op === '<=') && Number.isFinite(t.limit));

  const banner = {
    passed: { cls: 'pass', Icon: CircleCheck, title: 'PASSED', text: thresholds.length ? `All ${thresholds.length} rules were met.` : 'The test finished without errors.' },
    failed: { cls: 'fail', Icon: CircleX, title: 'FAILED', text: `${failedRules.length} of ${thresholds.length} rules were not met: ${failedRules.map(describe).join('; ')}.` },
    stopped: { cls: 'stop', Icon: OctagonX, title: 'STOPPED', text: 'You stopped the test before it finished. The numbers cover only the part that ran.' },
    error: { cls: 'error', Icon: TriangleAlert, title: 'DID NOT RUN', text: meta.error ?? 'k6 stopped unexpectedly.' },
    running: { cls: 'stop', Icon: Gauge, title: 'RUNNING', text: '' }
  }[meta.status];
  const BannerIcon = banner.Icon;
  const hasTimeline = series.length >= 3;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="row" style={{ marginBottom: 8 }}><StatusBadge status={meta.status} /><span className="muted small">{fmtDateTime(meta.startedAt)}</span></div>
          <h1>{meta.name}</h1>
          <p className="muted"><span className="mono">{meta.baseUrl}</span>{k ? ` · ${fmtDur(k.secs)}` : ''} · {config.steps.length} request{config.steps.length === 1 ? '' : 's'} per iteration</p>
        </div>
        <div className="row">
          <Link className="btn" href={`/new?from=${meta.id}`}><RotateCcw size={16} aria-hidden="true" /> Run again</Link>
          {result.hasReport && <a className="btn" href={`/api/runs/${meta.id}/report`} target="_blank" rel="noreferrer"><FileText size={16} aria-hidden="true" /> HTML report</a>}
          {result.hasReport && <a className="btn" href={`/api/runs/${meta.id}/report?type=json`} download><FileJson size={16} aria-hidden="true" /> JSON</a>}
        </div>
      </div>

      <div className={`verdict ${banner.cls}`} role="status">
        <BannerIcon size={34} aria-hidden="true" />
        <div><div className="big">{banner.title}</div><div>{banner.text}</div></div>
      </div>

      {(meta.status === 'failed' || meta.status === 'error') && meta.problems && meta.problems.length > 0 && (
        <section className="card" style={{ marginTop: 18 }} aria-labelledby="res-why">
          <div className="row" style={{ marginBottom: 8 }}><TriangleAlert size={18} aria-hidden="true" /><h2 id="res-why">What went wrong</h2></div>
          <p className="muted small" style={{ marginBottom: 12 }}>These are the first failing requests k6 saw:</p>
          <ul className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
            {meta.problems.map((p) => (<li key={p} className="mono small" style={{ overflowWrap: 'anywhere' }}>{p}</li>))}
          </ul>
          <div className="note" style={{ marginTop: 14 }}>
            <Info size={17} aria-hidden="true" />
            <span>HTTP 401 or 403 usually means the token or login is wrong. &ldquo;No response&rdquo; means nothing is listening at that address, so use <b>Test connection</b> in step 1. HTTP 404 means the path does not exist on that server.</span>
          </div>
        </section>
      )}

      {meta.status === 'error' && meta.logTail && meta.logTail.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h2>k6 output</h2>
          <div className="log tall" role="log" aria-label="k6 output">{meta.logTail.join('\n')}</div>
        </div>
      )}

      {k && (
        <div className="kpis">
          <Kpi icon={Activity} tone="ink" label="Requests" value={fmtInt(k.reqs)} sub={`${k.rps.toFixed(1)} per second`} />
          <Kpi icon={TriangleAlert} tone={k.failedRate > 0 ? 'red' : 'green'} label="Error rate" value={fmtPct(k.failedRate)} sub="failed requests" />
          <Kpi icon={Timer} tone="grey" label="Average" value={fmtMs(k.avg)} sub={`max ${fmtMs(k.max)}`} />
          <Kpi icon={Gauge} tone="amber" label="p95" value={fmtMs(k.p95)} sub="95% were faster" />
          <Kpi icon={Zap} tone="grey" label="p99" value={fmtMs(k.p99)} sub="99% were faster" />
          <Kpi icon={CircleCheck} tone={k.checksRate < 1 ? 'red' : 'green'} label="Checks passed" value={fmtPct(k.checksRate)} sub={`${fmtInt(k.iterations)} iterations`} />
        </div>
      )}

      {k && (
        <div className="chart-grid">
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Response time over the run</h3>
            {hasTimeline
              ? <LineChart label="Response time over the run" yFmt={fmtMs} limit={p95Rule ? { y: p95Rule.limit, label: `p95 limit ${fmtMs(p95Rule.limit)}` } : undefined}
                  series={[{ name: 'Average', data: series.map((s) => ({ x: s.t, y: s.avg })), area: true }, { name: 'p95', data: series.map((s) => ({ x: s.t, y: s.p95 })) }]} />
              : <p className="muted small">This run was too short to draw a timeline.</p>}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Users and throughput</h3>
            {hasTimeline
              ? <LineChart label="Virtual users and requests per second over the run"
                  series={[{ name: 'Virtual users', data: series.map((s) => ({ x: s.t, y: s.vus })), area: true }, { name: 'Requests per second', data: series.map((s) => ({ x: s.t, y: s.rps })) }]} />
              : <p className="muted small">This run was too short to draw a timeline.</p>}
          </div>
        </div>
      )}

      {thresholds.length > 0 && (
        <section className="card" style={{ marginTop: 18 }} aria-labelledby="res-thr">
          <h2 id="res-thr" style={{ marginBottom: 10 }}>Pass or fail rules</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Rule</th><th className="num">Limit</th><th className="num">Actual</th><th>Result</th></tr></thead>
              <tbody>
                {thresholds.map((t) => (
                  <tr key={t.metric + t.expr}>
                    <td className="mono">{t.metric} {t.stat}</td>
                    <td className="num">{t.op} {fmtThr(t.metric, t.limit)}</td>
                    <td className="num">{fmtThr(t.metric, t.actual)}</td>
                    <td>{t.ok ? <span className="badge ok"><CircleCheck size={13} aria-hidden="true" /> Passed</span> : <span className="badge bad"><CircleX size={13} aria-hidden="true" /> Failed</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card" style={{ marginTop: 18 }} aria-labelledby="res-checks">
        <h2 id="res-checks" style={{ marginBottom: 10 }}>Checks</h2>
        {checks.length === 0
          ? <p className="muted small">No checks were defined, so only the pass or fail rules decide the result. Add checks in step 2 to verify what your API returns.</p>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Check</th><th className="num">Passed</th><th className="num">Failed</th><th>Pass rate</th></tr></thead>
                <tbody>
                  {checks.map((c) => {
                    const total = c.passes + c.fails;
                    const rate = total ? c.passes / total : 1;
                    return (
                      <tr key={c.name}>
                        <td>{c.name}</td>
                        <td className="num">{fmtInt(c.passes)}</td>
                        <td className="num">{fmtInt(c.fails)}</td>
                        <td>
                          <div className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                            <div className={`bar${rate < 1 ? ' bad' : ''}`}><span style={{ width: `${(rate * 100).toFixed(1)}%` }} /></div>
                            <span className="small num" style={{ minWidth: 56 }}>{(rate * 100).toFixed(1)}%</span>
                            {rate < 1 ? <CircleX size={15} className="muted" aria-label="Some failed" /> : <CircleCheck size={15} className="muted" aria-label="All passed" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </>
  );
}
