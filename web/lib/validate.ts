// Input validation shared by the browser (to show friendly errors) and the server
// (the real gate before anything reaches k6). It rebuilds the object field by field,
// so unknown or oversized input never passes through.
import { parseDuration } from './format';
import type {
  AuthConfig,
  AuthType,
  CheckDef,
  CheckType,
  DataConfig,
  DataMode,
  ExtractDef,
  LoadConfig,
  LoadMode,
  Method,
  RunConfig,
  RunRequest,
  Secrets,
  StageDef,
  StepDef,
  TestType,
  ThresholdDef
} from './types';

export const LIMITS = {
  maxVus: 500,
  maxRate: 1000,
  maxIterations: 100000,
  maxSecs: 7200,
  maxStages: 20,
  maxSteps: 20,
  maxBody: 100000,
  maxRows: 10000,
  maxThresholds: 20,
  maxChecks: 20,
  maxHeaders: 30,
  maxThink: 60
} as const;

export const METRICS = ['http_req_duration', 'http_req_failed', 'checks', 'http_reqs', 'iteration_duration'] as const;
export const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const AUTH_TYPES: AuthType[] = ['none', 'bearer', 'apikey', 'basic', 'login'];
const TEST_TYPES: TestType[] = ['smoke', 'load', 'stress', 'spike', 'soak', 'custom'];
const LOAD_MODES: LoadMode[] = ['iterations', 'simple', 'stages', 'rate'];
const DATA_MODES: DataMode[] = ['sequential', 'random', 'per-vu'];
const CHECK_TYPES: CheckType[] = ['status', 'json', 'exists', 'contains', 'time'];
const OPS = ['<', '<=', '>', '>=', '=='];
const STAT_RE = /^(avg|min|med|max|rate|count|p\(\d{1,2}(\.\d+)?\))$/;
const HEADER_RE = /^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,100}$/;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,50}$/;

export type ValidationResult = { ok: true; value: RunRequest } | { ok: false; errors: string[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : fallback;

/** k6 needs a unit. A bare number means seconds here. */
export function normalizeDuration(input: unknown): string | null {
  const raw = typeof input === 'string' ? input.trim() : typeof input === 'number' ? String(input) : '';
  const secs = parseDuration(raw);
  if (!secs || secs <= 0) return null;
  return /[smh]$/i.test(raw) ? raw.toLowerCase() : raw + 's';
}

export function validateRunRequest(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObj(input) || !isObj(input.config)) return { ok: false, errors: ['The request has no test configuration.'] };
  const c = input.config;

  /* target */
  let baseUrl = '';
  try {
    const u = new URL(text(c.baseUrl, 2000).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') errors.push('Base URL must start with http:// or https://');
    else if (u.username || u.password) errors.push('Do not put a username or password in the URL. Use the Auth section instead.');
    else baseUrl = (u.origin + u.pathname).replace(/\/+$/, '');
  } catch {
    errors.push('Base URL is not valid. Example: http://localhost:8080');
  }

  /* headers */
  const headers: Record<string, string> = {};
  if (c.headers !== undefined && !isObj(c.headers)) errors.push('Headers must be a list of name and value pairs.');
  if (isObj(c.headers)) {
    const entries = Object.entries(c.headers);
    if (entries.length > LIMITS.maxHeaders) errors.push(`Use at most ${LIMITS.maxHeaders} headers.`);
    for (const [k, v] of entries.slice(0, LIMITS.maxHeaders)) {
      if (!HEADER_RE.test(k)) errors.push(`Header name "${k.slice(0, 30)}" is not valid.`);
      else headers[k] = text(v, 2000);
    }
  }

  /* auth */
  const a = isObj(c.auth) ? c.auth : {};
  const authType = oneOf(a.type, AUTH_TYPES, 'none');
  const auth: AuthConfig = { type: authType };
  if (authType === 'apikey') {
    auth.headerName = text(a.headerName, 100) || 'X-API-Key';
    if (!HEADER_RE.test(auth.headerName)) errors.push('API key header name is not valid.');
  }
  if (authType === 'basic') auth.username = text(a.username, 200);
  if (authType === 'login') {
    auth.loginPath = text(a.loginPath, 500);
    auth.username = text(a.username, 200);
    auth.usernameField = text(a.usernameField, 60) || 'username';
    auth.passwordField = text(a.passwordField, 60) || 'password';
    auth.tokenPath = text(a.tokenPath, 200) || '$.token';
    if (!auth.loginPath.startsWith('/')) errors.push('Login path must start with /');
  }

  /* steps */
  const steps: StepDef[] = [];
  const rawSteps = Array.isArray(c.steps) ? c.steps : [];
  if (rawSteps.length === 0) errors.push('Add at least one request.');
  if (rawSteps.length > LIMITS.maxSteps) errors.push(`Use at most ${LIMITS.maxSteps} requests in one test.`);
  rawSteps.slice(0, LIMITS.maxSteps).forEach((raw, i) => {
    const label = `Request ${i + 1}`;
    if (!isObj(raw)) { errors.push(`${label} is not valid.`); return; }
    const name = text(raw.name, 60).trim() || label;
    const method = oneOf(raw.method, METHODS, 'GET');
    const path = text(raw.path, 2000).trim();
    if (!path.startsWith('/')) errors.push(`${label}: the path must start with / (for example /api/orders).`);
    const body = text(raw.body, LIMITS.maxBody);
    if (typeof raw.body === 'string' && raw.body.length > LIMITS.maxBody) errors.push(`${label}: the body is too large.`);

    const sh: Record<string, string> = {};
    if (isObj(raw.headers)) {
      for (const [k, v] of Object.entries(raw.headers).slice(0, LIMITS.maxHeaders)) {
        if (!HEADER_RE.test(k)) errors.push(`${label}: header name "${k.slice(0, 30)}" is not valid.`);
        else sh[k] = text(v, 2000);
      }
    }

    const extract: ExtractDef[] = [];
    (Array.isArray(raw.extract) ? raw.extract : []).slice(0, LIMITS.maxChecks).forEach((e) => {
      if (!isObj(e)) return;
      const n = text(e.name, 51);
      if (!KEY_RE.test(n)) errors.push(`${label}: a saved value needs a name with letters, numbers or _ (got "${n.slice(0, 20)}").`);
      else extract.push({ name: n, path: text(e.path, 200) || '$.id' });
    });

    const checks: CheckDef[] = [];
    (Array.isArray(raw.checks) ? raw.checks : []).slice(0, LIMITS.maxChecks).forEach((k) => {
      if (!isObj(k)) return;
      const type = oneOf(k.type, CHECK_TYPES, 'status');
      const def: CheckDef = { type };
      if (type === 'json' || type === 'exists') def.path = text(k.path, 200) || '$.';
      if (type !== 'exists') def.value = text(k.value, 500);
      if (type === 'status' && !/^\d{3}$/.test(def.value ?? '')) errors.push(`${label}: a status check needs a 3-digit code such as 200.`);
      if (type === 'time' && !(Number(def.value) > 0)) errors.push(`${label}: a response time check needs a number of milliseconds.`);
      checks.push(def);
    });

    let think: number | undefined;
    if (raw.think !== undefined && raw.think !== null && raw.think !== '') {
      const t = Number(raw.think);
      if (!Number.isFinite(t) || t < 0 || t > LIMITS.maxThink) errors.push(`${label}: wait time must be between 0 and ${LIMITS.maxThink} seconds.`);
      else think = t;
    }

    steps.push({ name, method, path, headers: sh, body, extract, checks, think, useAuth: raw.useAuth !== false });
  });

  /* load */
  const l = isObj(c.load) ? c.load : {};
  const mode = oneOf(l.mode, LOAD_MODES, 'iterations');
  const bounded = (v: unknown, min: number, max: number, label: string, fallback: number): number => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < min || n > max) { errors.push(`${label} must be between ${min} and ${max}.`); return fallback; }
    return n;
  };
  const load: LoadConfig = { mode, vus: 1, duration: '30s', iterations: 5, rate: 5, stages: [], think: 0 };
  const thinkRaw = Number(l.think ?? 0);
  if (!Number.isFinite(thinkRaw) || thinkRaw < 0 || thinkRaw > LIMITS.maxThink) errors.push(`Pause between requests must be between 0 and ${LIMITS.maxThink} seconds.`);
  else load.think = thinkRaw;

  if (mode === 'iterations') {
    load.vus = bounded(l.vus, 1, LIMITS.maxVus, 'Virtual users', 1);
    load.iterations = bounded(l.iterations, 1, LIMITS.maxIterations, 'Iterations', 5);
  } else if (mode === 'simple' || mode === 'rate') {
    if (mode === 'simple') load.vus = bounded(l.vus, 1, LIMITS.maxVus, 'Virtual users', 1);
    else load.rate = bounded(l.rate, 1, LIMITS.maxRate, 'Iterations per second', 5);
    const d = normalizeDuration(l.duration);
    if (!d) errors.push('Duration is not valid. Use values like 30s, 5m or 1h.');
    else if (parseDuration(d) > LIMITS.maxSecs) errors.push('Duration is too long (the limit is 2 hours).');
    else load.duration = d;
  } else {
    const rawStages = Array.isArray(l.stages) ? l.stages : [];
    if (rawStages.length === 0) errors.push('Add at least one stage.');
    if (rawStages.length > LIMITS.maxStages) errors.push(`Use at most ${LIMITS.maxStages} stages.`);
    let total = 0;
    const stages: StageDef[] = [];
    rawStages.slice(0, LIMITS.maxStages).forEach((s, i) => {
      if (!isObj(s)) return;
      const d = normalizeDuration(s.duration);
      if (!d) { errors.push(`Stage ${i + 1}: duration is not valid. Use values like 30s or 2m.`); return; }
      total += parseDuration(d);
      stages.push({ duration: d, target: bounded(s.target, 0, LIMITS.maxVus, `Stage ${i + 1} target users`, 0) });
    });
    if (total > LIMITS.maxSecs) errors.push('The stages add up to more than 2 hours.');
    load.stages = stages;
  }

  /* thresholds */
  const thresholds: ThresholdDef[] = [];
  const rawThr = Array.isArray(c.thresholds) ? c.thresholds : [];
  if (rawThr.length > LIMITS.maxThresholds) errors.push(`Use at most ${LIMITS.maxThresholds} thresholds.`);
  rawThr.slice(0, LIMITS.maxThresholds).forEach((t, i) => {
    if (!isObj(t)) return;
    const metric = text(t.metric, 40);
    const stat = text(t.stat, 20);
    const op = text(t.op, 3);
    const value = Number(t.value);
    if (!(METRICS as readonly string[]).includes(metric)) errors.push(`Threshold ${i + 1}: unknown metric.`);
    else if (!STAT_RE.test(stat)) errors.push(`Threshold ${i + 1}: unknown measure "${stat}".`);
    else if (!OPS.includes(op)) errors.push(`Threshold ${i + 1}: unknown rule "${op}".`);
    else if (!Number.isFinite(value)) errors.push(`Threshold ${i + 1}: the value must be a number.`);
    else thresholds.push({ metric, stat, op, value, abort: t.abort === true });
  });

  /* data file */
  let data: DataConfig | undefined;
  if (isObj(c.data) && Array.isArray(c.data.rows) && c.data.rows.length > 0) {
    if (c.data.rows.length > LIMITS.maxRows) errors.push(`The data file can have at most ${LIMITS.maxRows} rows.`);
    const rows = c.data.rows.slice(0, LIMITS.maxRows).map((r) => {
      const row: Record<string, string> = {};
      if (isObj(r)) {
        for (const [k, v] of Object.entries(r).slice(0, 50)) {
          if (KEY_RE.test(k)) row[k] = String(v ?? '').slice(0, 1000);
        }
      }
      return row;
    });
    data = { rows, mode: oneOf(c.data.mode, DATA_MODES, 'sequential') };
  }

  /* secrets */
  const s = isObj(input.secrets) ? input.secrets : {};
  const secrets: Secrets = {};
  if (typeof s.token === 'string' && s.token) secrets.token = s.token.slice(0, 8000);
  if (typeof s.apiKey === 'string' && s.apiKey) secrets.apiKey = s.apiKey.slice(0, 8000);
  if (typeof s.password === 'string' && s.password) secrets.password = s.password.slice(0, 2000);

  if (errors.length) return { ok: false, errors };

  const config: RunConfig = {
    name: text(c.name, 80).trim() || 'Untitled test',
    testType: oneOf(c.testType, TEST_TYPES, 'custom'),
    baseUrl,
    headers,
    auth,
    steps,
    data,
    load,
    thresholds
  };
  return { ok: true, value: { config, secrets, confirmRemote: input.confirmRemote === true } };
}
