// Starts k6 as a child process, follows its progress, and stores the result.
// Safety rules: arguments are passed as an array (never a shell string), only the
// fixed generic runner script is executed, secrets travel through an environment
// variable and are never written to disk.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { estimateRun, isHeavy, isSafeHost } from '../format';
import type { HealthInfo, RunMeta, RunRequest, RunSnapshot, Sample } from '../types';
import { HttpError } from './http';
import { newRunId, PROJECT_ROOT, RUNNER_SCRIPT, runDir } from './paths';
import { buildKpis, listRuns, readSummary, writeMeta } from './results';

type RunEvent =
  | { type: 'sample'; sample: Sample; totals: RunSnapshot['totals'] }
  | { type: 'log'; line: string }
  | { type: 'done'; meta: RunMeta };

type Listener = (event: RunEvent) => void;

interface ActiveRun {
  id: string;
  meta: RunMeta;
  proc: ChildProcess;
  series: Sample[];
  log: string[];
  totals: RunSnapshot['totals'];
  listeners: Set<Listener>;
  timer: NodeJS.Timeout;
  killTimer?: NodeJS.Timeout;
  offset: number;
  partial: string;
  stopping: boolean;
  closed: boolean;
  lastTick: number;
  lastVus: number;
  lastAvg: number;
  lastP95: number;
  win: { reqs: number; durs: number[]; failed: number };
  problems: string[];
}

// Kept on globalThis so hot reload in dev does not forget a running test.
const g = globalThis as unknown as { __pulsar?: { active: ActiveRun | null; k6?: { at: number; info: HealthInfo['k6'] } } };
const store = (g.__pulsar ??= { active: null });

const MAX_LOG = 400;
const MAX_SERIES = 3000;

export function getActiveId(): string | null {
  return store.active ? store.active.id : null;
}

export function getHealth(): HealthInfo {
  const now = Date.now();
  if (!store.k6 || now - store.k6.at > 30000) {
    const res = spawnSync('k6', ['version'], { encoding: 'utf8', timeout: 5000 });
    const match = /k6\s+v?(\S+)/.exec(res.stdout || '');
    store.k6 = { at: now, info: res.error || res.status !== 0 ? { found: false } : { found: true, version: match ? match[1] : undefined } };
  }
  return { ok: true, k6: store.k6.info, activeRunId: getActiveId() };
}

export function listHistory(): RunMeta[] {
  return listRuns(getActiveId());
}

function pushLog(run: ActiveRun, raw: string): void {
  const line = raw.replace(/\u001b\[[0-9;]*m/g, '').trimEnd();
  if (!line) return;
  if (line.includes('[Pulsar]') && run.problems.length < 6) {
    const m = /msg="((?:[^"\\]|\\.)*)"/.exec(line);
    const text = (m ? m[1].replace(/\\"/g, '"') : line).replace(/^\[Pulsar\]\s*/, '');
    if (!run.problems.includes(text)) run.problems.push(text);
  }
  run.log.push(line);
  if (run.log.length > MAX_LOG) run.log.splice(0, run.log.length - MAX_LOG);
  emit(run, { type: 'log', line });
}

function emit(run: ActiveRun, event: RunEvent): void {
  run.listeners.forEach((l) => {
    try { l(event); } catch { /* a closed client must not break the run */ }
  });
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

/** Read what k6 wrote to the points file since last time and fold it into the current window. */
function drain(run: ActiveRun, pointsFile: string): void {
  let fd: number;
  try { fd = fs.openSync(pointsFile, 'r'); } catch { return; }
  try {
    const size = fs.fstatSync(fd).size;
    if (size <= run.offset) return;
    const buf = Buffer.alloc(size - run.offset);
    fs.readSync(fd, buf, 0, buf.length, run.offset);
    run.offset = size;
    const lines = (run.partial + buf.toString('utf8')).split('\n');
    run.partial = lines.pop() ?? '';
    for (const line of lines) {
      // k6 2.x writes {"metric":...,"type":"Point",...}; older versions put "type" first. Accept both.
      if (!line.includes('"type":"Point"')) continue;
      let o: { metric: string; data: { value: number } };
      try { o = JSON.parse(line); } catch { continue; }
      const v = o.data.value;
      switch (o.metric) {
        case 'http_reqs': run.win.reqs += v; run.totals.reqs += v; break;
        case 'http_req_duration': run.win.durs.push(v); break;
        case 'http_req_failed': if (v >= 1) { run.win.failed += 1; run.totals.failed += 1; } break;
        case 'vus': run.lastVus = v; break;
        case 'iterations': run.totals.iterations += v; break;
      }
    }
  } finally {
    fs.closeSync(fd);
  }
}

function tick(run: ActiveRun, pointsFile: string): void {
  drain(run, pointsFile);
  const now = Date.now();
  const dt = Math.max(0.2, (now - run.lastTick) / 1000);
  run.lastTick = now;
  const w = run.win;
  if (w.durs.length) {
    run.lastAvg = w.durs.reduce((a, b) => a + b, 0) / w.durs.length;
    run.lastP95 = percentile(w.durs, 95);
  }
  const sample: Sample = {
    t: Math.round(((now - run.meta.startedAt) / 1000) * 10) / 10,
    vus: run.lastVus,
    rps: Math.round((w.reqs / dt) * 10) / 10,
    avg: Math.round(run.lastAvg * 10) / 10,
    p95: Math.round(run.lastP95 * 10) / 10,
    errRate: w.reqs ? w.failed / w.reqs : 0
  };
  run.win = { reqs: 0, durs: [], failed: 0 };
  run.series.push(sample);
  if (run.series.length > MAX_SERIES) run.series = run.series.filter((_, i) => i % 2 === 0);
  emit(run, { type: 'sample', sample, totals: run.totals });
}

function finish(run: ActiveRun, code: number | null, pointsFile: string, spawnError?: string): void {
  if (run.closed) return;
  run.closed = true;
  clearInterval(run.timer);
  if (run.killTimer) clearTimeout(run.killTimer);
  if (run.partial.trim()) { pushLog(run, run.partial); run.partial = ''; }
  tick(run, pointsFile);

  const dir = runDir(run.id);
  try { fs.writeFileSync(path.join(dir, 'series.json'), JSON.stringify(run.series)); } catch { /* not fatal */ }
  try { fs.rmSync(pointsFile, { force: true }); } catch { /* not fatal */ }

  const meta = run.meta;
  meta.endedAt = Date.now();
  meta.exitCode = code;
  if (run.stopping) meta.status = 'stopped';
  else if (code === 0) meta.status = 'passed';
  else if (code === 99) meta.status = 'failed';
  else meta.status = 'error';

  const summary = readSummary(run.id);
  if (summary) meta.kpis = buildKpis(summary);
  if (meta.status === 'error') {
    const errLine = [...run.log].reverse().find((l) => /level=error|ERRO|GoError|Error:/.test(l));
    meta.error = spawnError || errLine || 'k6 stopped unexpectedly. See the output below.';
  }
  meta.logTail = run.log.slice(-60);
  if (run.problems.length) meta.problems = run.problems;
  try { writeMeta(meta); } catch { /* not fatal */ }

  store.active = null;
  emit(run, { type: 'done', meta });
}

export function startRun(req: RunRequest): { id: string } {
  const config = req.config;
  if (store.active) throw new HttpError(409, 'A test is already running. Stop it or wait for it to finish.', { code: 'busy' });
  if (!getHealth().k6.found) throw new HttpError(503, 'k6 was not found on this machine. Install it from https://k6.io and try again.', { code: 'no-k6' });
  if (isHeavy(config) && !isSafeHost(config.baseUrl) && !req.confirmRemote) {
    throw new HttpError(409, 'This is a heavy test against a host that is not local. Confirm that you own it or may test it.', { code: 'confirm-remote' });
  }

  const id = newRunId();
  const dir = runDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const configFile = path.join(dir, 'config.json');
  const pointsFile = path.join(dir, 'points.json');
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2)); // secrets are not part of the config

  const meta: RunMeta = {
    id,
    name: config.name,
    testType: config.testType,
    baseUrl: config.baseUrl,
    status: 'running',
    startedAt: Date.now(),
    expectedSecs: Math.round(estimateRun(config).secs)
  };
  writeMeta(meta);

  const proc = spawn('k6', ['run', '--no-color', '--out', `json=${pointsFile}`, RUNNER_SCRIPT], {
    cwd: PROJECT_ROOT,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PC_CONFIG_FILE: configFile,
      PC_SECRETS: JSON.stringify(req.secrets ?? {}),
      RUN_ID: id,
      K6_NO_USAGE_REPORT: 'true'
    }
  });

  const run: ActiveRun = {
    id, meta, proc, series: [], log: [], totals: { reqs: 0, failed: 0, iterations: 0 }, listeners: new Set(),
    timer: setInterval(() => tick(run, pointsFile), 1000), offset: 0, partial: '', stopping: false, closed: false,
    lastTick: Date.now(), lastVus: 0, lastAvg: 0, lastP95: 0, win: { reqs: 0, durs: [], failed: 0 }, problems: []
  };
  store.active = run;

  const onData = (chunk: Buffer) => chunk.toString('utf8').split(/\r?\n/).forEach((l) => pushLog(run, l));
  proc.stdout?.on('data', onData);
  proc.stderr?.on('data', onData);
  proc.on('error', (err) => finish(run, null, pointsFile, `Could not start k6: ${err.message}`));
  proc.on('close', (code) => finish(run, code, pointsFile));

  return { id };
}

export function stopRun(id: string): void {
  const run = store.active;
  if (!run || run.id !== id) throw new HttpError(404, 'That test is not running.');
  if (run.stopping) return;
  run.stopping = true;
  pushLog(run, 'Stopping the test...');
  run.proc.kill('SIGINT'); // k6 stops gracefully and still writes its summary
  run.killTimer = setTimeout(() => { if (!run.closed) run.proc.kill('SIGKILL'); }, 8000);
}

export function snapshotOf(id: string): RunSnapshot | null {
  const run = store.active;
  if (!run || run.id !== id) return null;
  return { meta: run.meta, series: run.series, log: run.log, totals: run.totals };
}

export function subscribe(id: string, listener: Listener): (() => void) | null {
  const run = store.active;
  if (!run || run.id !== id) return null;
  run.listeners.add(listener);
  return () => { run.listeners.delete(listener); };
}
