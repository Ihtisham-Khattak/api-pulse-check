import type { RunConfig } from './types';

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtMs(v: number): string {
  if (!Number.isFinite(v)) return '-';
  return v >= 1000 ? (v / 1000).toFixed(2) + ' s' : v < 10 ? v.toFixed(1) + ' ms' : Math.round(v) + ' ms';
}

export function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return '-';
  return (v * 100).toFixed(v < 0.1 ? 2 : 1) + '%';
}

export function fmtDur(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s >= 3600) return Math.floor(s / 3600) + 'h ' + String(Math.floor((s % 3600) / 60)).padStart(2, '0') + 'm';
  if (s >= 60) return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's';
  return s + 's';
}

export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

/** "30s", "5m", "1h" or a bare number of seconds. Returns 0 when it cannot be read. */
export function parseDuration(input: string): number {
  const m = String(input).trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h)?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  return unit === 'h' ? n * 3600 : unit === 'm' ? n * 60 : n;
}

export interface RunEstimate {
  secs: number;
  peakVus: number;
  avgVus: number;
  approxRequests: number;
}

/** A rough estimate for display only. Real numbers come from k6. */
export function estimateRun(config: RunConfig): RunEstimate {
  const load = config.load;
  const steps = Math.max(1, config.steps.length);
  const stepThink = config.steps.reduce(
    (sum, s) => sum + (s.think !== undefined ? s.think : load.think),
    0
  );
  const iterSecs = 0.25 * steps + stepThink;

  if (load.mode === 'iterations') {
    const secs = Math.max(1, (load.iterations / Math.max(1, load.vus)) * iterSecs);
    return { secs, peakVus: load.vus, avgVus: load.vus, approxRequests: load.iterations * steps };
  }
  if (load.mode === 'simple') {
    const secs = parseDuration(load.duration);
    return { secs, peakVus: load.vus, avgVus: load.vus, approxRequests: (load.vus * secs * steps) / iterSecs };
  }
  if (load.mode === 'rate') {
    const secs = parseDuration(load.duration);
    return { secs, peakVus: Math.ceil(load.rate * iterSecs), avgVus: Math.ceil(load.rate * iterSecs), approxRequests: load.rate * secs * steps };
  }
  let secs = 0;
  let prev = 0;
  let area = 0;
  let peak = 0;
  for (const st of load.stages) {
    const d = parseDuration(st.duration);
    area += ((prev + st.target) / 2) * d;
    secs += d;
    prev = st.target;
    peak = Math.max(peak, st.target);
  }
  const avgVus = secs ? area / secs : 0;
  return { secs, peakVus: peak, avgVus, approxRequests: (avgVus * secs * steps) / iterSecs };
}

/** Points for the "load over time" chart: virtual users, or iterations per second in rate mode. */
export function profilePoints(config: RunConfig): { x: number; y: number }[] {
  const load = config.load;
  if (load.mode === 'stages') {
    let t = 0;
    const pts = [{ x: 0, y: 0 }];
    for (const st of load.stages) {
      t += parseDuration(st.duration);
      pts.push({ x: t, y: st.target });
    }
    return pts;
  }
  const secs = Math.max(1, estimateRun(config).secs);
  const level = load.mode === 'rate' ? load.rate : load.vus;
  return [{ x: 0, y: level }, { x: secs, y: level }];
}

const SAFE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'dummyjson.com']);

/** Local machines and the public demo API need no extra confirmation for heavy tests. */
export function isSafeHost(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return SAFE_HOSTS.has(host) || host.endsWith('.localhost');
  } catch {
    return false;
  }
}

/** Load, stress, spike and soak profiles, or anything that sends a lot of traffic. */
export function isHeavy(config: RunConfig): boolean {
  if (config.testType !== 'smoke' && config.testType !== 'custom') return true;
  const est = estimateRun(config);
  return est.peakVus > 20 || est.approxRequests > 5000;
}
