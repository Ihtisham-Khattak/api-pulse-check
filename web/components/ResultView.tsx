'use client';

import {
  CircleCheck, CircleX, FileJson, FileText, Gauge, Info, OctagonX, RotateCcw, TriangleAlert
} from 'lucide-react';
import Link from 'next/link';
import { doubledSegment, fmtDateTime, fmtDur, fmtInt, fmtMs, fmtPct } from '@/lib/format';
import type { RunResult, ThresholdResult } from '@/lib/types';
import { LineChart } from './charts/LineChart';
import { Kpi, Readout, StatusBadge } from './ui';

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
    passed: { cls: 'pass', Icon: CircleCheck, title: 'Passed', text: thresholds.length ? `All ${thresholds.length} rules were met.` : 'The test finished without errors.' },
    failed: { cls: 'fail', Icon: CircleX, title: 'Failed', text: `${failedRules.length} of ${thresholds.length} rules were not met:` },
    stopped: { cls: 'stop', Icon: OctagonX, title: 'Stopped', text: 'You stopped the test before it finished. The numbers cover only the part that ran.' },
    error: { cls: 'error', Icon: TriangleAlert, title: 'Did not run', text: meta.error ?? 'k6 stopped unexpectedly.' },
    running: { cls: 'stop', Icon: Gauge, title: 'Running', text: '' }
  }[meta.status];
  const BannerIcon = banner.Icon;
  const hasTimeline = series.length >= 3;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="row snug page-meta"><StatusBadge status={meta.status} /><span className="muted small">{fmtDateTime(meta.startedAt)}</span></div>
          <h1>{meta.name}</h1>
          <p className="break"><span className="mono">{meta.baseUrl}</span>{k ? ` · ${fmtDur(k.secs)}` : ''} · {config.steps.length} request{config.steps.length === 1 ? '' : 's'} per iteration</p>
        </div>
        <div className="row snug">
          <Link className="btn primary" href={`/new?from=${meta.id}`}><RotateCcw size={16} aria-hidden="true" /> Run again</Link>
          {result.hasReport && <a className="btn" href={`/api/runs/${meta.id}/report`} target="_blank" rel="noreferrer"><FileText size={16} aria-hidden="true" /> HTML report</a>}
          {result.hasReport && <a className="btn" href={`/api/runs/${meta.id}/report?type=json`} download><FileJson size={16} aria-hidden="true" /> JSON</a>}
        </div>
      </div>

      <div className="stack-lg">
      <div className={`verdict ${banner.cls}`} role="status">
        <BannerIcon size={28} aria-hidden="true" />
        <div>
          <div className="big">{banner.title}</div>
          <div>{banner.text}</div>
          {meta.status === 'failed' && failedRules.length > 0 && (
            <ul>{failedRules.map((t) => (<li key={t.metric + t.expr}>{describe(t)}</li>))}</ul>
          )}
        </div>
      </div>

      {(meta.status === 'failed' || meta.status === 'error') && meta.problems && meta.problems.length > 0 && (
        <section className="card stack" aria-labelledby="res-why">
          <div className="sect">
            <h2 id="res-why">What went wrong</h2>
            <p>These are the first failing requests k6 saw:</p>
          </div>
          <ul className="stack-sm problems">
            {meta.problems.map((p) => (<li key={p} className="mono break">{p}</li>))}
          </ul>
          {meta.problems.some((p) => /HTTP 404/.test(p) && doubledSegment(p)) && (
            <div className="note warn">
              <TriangleAlert size={17} aria-hidden="true" />
              <span>The address above repeats a part of the path (<b className="mono">/{doubledSegment(meta.problems.find((p) => /HTTP 404/.test(p) && doubledSegment(p)) ?? '')}/{doubledSegment(meta.problems.find((p) => /HTTP 404/.test(p) && doubledSegment(p)) ?? '')}</b>). Your Base URL probably already ends with it, so remove it from the request path in step 2.</span>
            </div>
          )}
          <div className="note">
            <Info size={17} aria-hidden="true" />
            <span>HTTP 401 or 403 usually means the token or login is wrong. &ldquo;No response&rdquo; means nothing is listening at that address, so use <b>Test connection</b> in step 1. HTTP 404 means the path does not exist on that server.</span>
          </div>
        </section>
      )}

      {meta.status === 'error' && meta.logTail && meta.logTail.length > 0 && (
        <div className="card">
          <h2>k6 output</h2>
          <div className="log tall" role="log" aria-label="k6 output">{meta.logTail.join('\n')}</div>
        </div>
      )}

      {k && (
        <Readout count={6}>
          <Kpi label="Requests" value={fmtInt(k.reqs)} sub={`${k.rps.toFixed(1)} per second`} />
          <Kpi label="Error rate" value={fmtPct(k.failedRate)} sub="failed requests" bad={k.failedRate > 0} />
          <Kpi label="Average" value={fmtMs(k.avg)} sub={`max ${fmtMs(k.max)}`} />
          <Kpi label="p95" value={fmtMs(k.p95)} sub="95% were faster" />
          <Kpi label="p99" value={fmtMs(k.p99)} sub="99% were faster" />
          <Kpi label="Checks passed" value={fmtPct(k.checksRate)} sub={`${fmtInt(k.iterations)} iterations`} bad={k.checksRate < 1} />
        </Readout>
      )}

      {k && (
        <div className="chart-grid">
          <div className="card">
            <h2 className="sect">Response time over the run</h2>
            {hasTimeline
              ? <LineChart label="Response time over the run" yFmt={fmtMs} limit={p95Rule ? { y: p95Rule.limit, label: `p95 limit ${fmtMs(p95Rule.limit)}` } : undefined}
                  series={[{ name: 'Average', data: series.map((s) => ({ x: s.t, y: s.avg })), area: true }, { name: 'p95', data: series.map((s) => ({ x: s.t, y: s.p95 })) }]} />
              : <p className="muted small">This run was too short to draw a timeline.</p>}
          </div>
          <div className="card">
            <h2 className="sect">Users and throughput</h2>
            {hasTimeline
              ? <LineChart label="Virtual users and requests per second over the run"
                  series={[{ name: 'Virtual users', data: series.map((s) => ({ x: s.t, y: s.vus })), area: true }, { name: 'Requests per second', data: series.map((s) => ({ x: s.t, y: s.rps })) }]} />
              : <p className="muted small">This run was too short to draw a timeline.</p>}
          </div>
        </div>
      )}

      {thresholds.length > 0 && (
        <section className="card" aria-labelledby="res-thr">
          <h2 id="res-thr" className="sect">Pass or fail rules</h2>
          <div className="table-wrap stackable">
            <table>
              <thead><tr><th>Rule</th><th className="num">Limit</th><th className="num">Actual</th><th>Result</th></tr></thead>
              <tbody>
                {thresholds.map((t) => (
                  <tr key={t.metric + t.expr}>
                    <td className="full mono break">{t.metric} {t.stat}</td>
                    <td className="num"><span className="cell-label">Limit</span>{t.op} {fmtThr(t.metric, t.limit)}</td>
                    <td className="num"><span className="cell-label">Actual</span>{fmtThr(t.metric, t.actual)}</td>
                    <td className="full">{t.ok ? <span className="badge ok"><CircleCheck size={13} aria-hidden="true" /> Passed</span> : <span className="badge bad"><CircleX size={13} aria-hidden="true" /> Failed</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="res-checks">
        <h2 id="res-checks" className="sect">Checks</h2>
        {checks.length === 0
          ? <p className="muted small">No checks were defined, so only the pass or fail rules decide the result. Add checks in step 2 to verify what your API returns.</p>
          : (
            <div className="table-wrap stackable">
              <table>
                <thead><tr><th>Check</th><th className="num">Passed</th><th className="num">Failed</th><th>Pass rate</th></tr></thead>
                <tbody>
                  {checks.map((c) => {
                    const total = c.passes + c.fails;
                    const rate = total ? c.passes / total : 1;
                    return (
                      <tr key={c.name}>
                        <td className="full break">{c.name}</td>
                        <td className="num"><span className="cell-label">Passed</span>{fmtInt(c.passes)}</td>
                        <td className="num"><span className="cell-label">Failed</span>{fmtInt(c.fails)}</td>
                        <td className="full">
                          <div className="row nowrap snug">
                            <div className={`bar${rate < 1 ? ' bad' : ''}`}><span style={{ width: `${(rate * 100).toFixed(1)}%` }} /></div>
                            <span className="small num rate">{(rate * 100).toFixed(1)}%</span>
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
      </div>
    </>
  );
}
