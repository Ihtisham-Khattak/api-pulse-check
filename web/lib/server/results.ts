import fs from 'node:fs';
import path from 'node:path';
import { isRunId, RUNS_DIR, runDir } from './paths';
import type { CheckResult, Kpis, RunConfig, RunMeta, RunResult, Sample, ThresholdResult } from '../types';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function readMeta(id: string): RunMeta | null {
  if (!isRunId(id)) return null;
  return readJson<RunMeta>(path.join(runDir(id), 'meta.json'));
}

export function writeMeta(meta: RunMeta): void {
  fs.writeFileSync(path.join(runDir(meta.id), 'meta.json'), JSON.stringify(meta, null, 2));
}

export function readSummary(id: string): Json | null {
  return readJson<Json>(path.join(runDir(id), 'summary.json'));
}

export function hasReport(id: string): boolean {
  return fs.existsSync(path.join(runDir(id), 'report.html'));
}

export function buildKpis(summary: Json): Kpis {
  const m: Json = summary.metrics ?? {};
  const dur: Json = m.http_req_duration?.values ?? {};
  return {
    reqs: m.http_reqs?.values?.count ?? 0,
    rps: m.http_reqs?.values?.rate ?? 0,
    failedRate: m.http_req_failed?.values?.rate ?? 0,
    avg: dur.avg ?? 0,
    p90: dur['p(90)'] ?? 0,
    p95: dur['p(95)'] ?? 0,
    p99: dur['p(99)'] ?? 0,
    max: dur.max ?? 0,
    secs: (summary.state?.testRunDurationMs ?? 0) / 1000,
    iterations: m.iterations?.values?.count ?? 0,
    checksRate: m.checks?.values?.rate ?? 1
  };
}

const EXPR_RE = /^(avg|min|med|max|rate|count|p\(\d+(?:\.\d+)?\))\s*(<=|>=|<|>|==)\s*(.+)$/;

export function buildThresholds(summary: Json): ThresholdResult[] {
  const out: ThresholdResult[] = [];
  const metrics: Json = summary.metrics ?? {};
  for (const [name, metric] of Object.entries<Json>(metrics)) {
    if (name.includes('{') || !metric.thresholds) continue;
    for (const [expr, res] of Object.entries<Json>(metric.thresholds)) {
      const m = EXPR_RE.exec(expr);
      const stat = m ? m[1] : expr;
      const actual = m ? (metric.values?.[stat] ?? null) : null;
      out.push({ metric: name, expr, stat, op: m ? m[2] : '', limit: m ? Number(m[3]) : NaN, actual, ok: res.ok === true });
    }
  }
  return out;
}

function collectChecks(group: Json | undefined, out: CheckResult[]): void {
  if (!group) return;
  const checks: Json[] = Array.isArray(group.checks) ? group.checks : Object.values(group.checks ?? {});
  for (const c of checks) out.push({ name: String(c.name), passes: Number(c.passes) || 0, fails: Number(c.fails) || 0 });
  const groups: Json[] = Array.isArray(group.groups) ? group.groups : Object.values(group.groups ?? {});
  for (const g of groups) collectChecks(g, out);
}

export function buildChecks(summary: Json): CheckResult[] {
  const out: CheckResult[] = [];
  collectChecks(summary.root_group, out);
  return out;
}

export function loadRunResult(id: string): RunResult | null {
  const meta = readMeta(id);
  if (!meta) return null;
  const dir = runDir(id);
  const config = readJson<RunConfig>(path.join(dir, 'config.json'));
  if (!config) return null;
  const summary = readSummary(id);
  return {
    meta,
    config,
    thresholds: summary ? buildThresholds(summary) : [],
    checks: summary ? buildChecks(summary) : [],
    series: readJson<Sample[]>(path.join(dir, 'series.json')) ?? [],
    hasReport: hasReport(id)
  };
}

/** A run that says "running" but is not the active one was cut short (the server restarted). */
export function markStale(meta: RunMeta, activeId: string | null): RunMeta {
  if (meta.status === 'running' && meta.id !== activeId) {
    meta.status = 'error';
    meta.error = 'The server stopped while this test was running.';
    meta.endedAt = meta.endedAt ?? Date.now();
    try { writeMeta(meta); } catch { /* ignore */ }
  }
  return meta;
}

export function listRuns(activeId: string | null): RunMeta[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(RUNS_DIR);
  } catch {
    return [];
  }
  const runs: RunMeta[] = [];
  for (const name of names) {
    if (!isRunId(name)) continue;
    const meta = readMeta(name);
    if (!meta) continue;
    runs.push(markStale(meta, activeId));
  }
  return runs.sort((a, b) => b.startedAt - a.startedAt);
}

export function deleteRun(id: string): boolean {
  const dir = runDir(id);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}
