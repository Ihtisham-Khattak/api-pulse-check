// Form state for the "New test" flow, and conversion to and from the run config.
import { presetFor } from './presets';
import type {
  AuthType,
  CheckDef,
  DataMode,
  ExtractDef,
  LoadConfig,
  Method,
  RunConfig,
  RunRequest,
  TestType,
  ThresholdDef
} from './types';

export const uid = (): string => Math.random().toString(36).slice(2, 9);

export interface HeaderRow { id: string; k: string; v: string; on: boolean }
export interface StageRow { id: string; duration: string; target: number }
export interface ThresholdRow extends ThresholdDef { id: string }
export interface CheckRow extends CheckDef { id: string }
export interface ExtractRow extends ExtractDef { id: string }

export interface StepForm {
  id: string;
  name: string;
  method: Method;
  path: string;
  headers: HeaderRow[];
  body: string;
  extract: ExtractRow[];
  checks: CheckRow[];
  /** Empty string means "use the default pause". */
  think: string;
  useAuth: boolean;
}

export interface AuthForm {
  type: AuthType;
  token: string;
  headerName: string;
  apiKey: string;
  username: string;
  password: string;
  loginPath: string;
  usernameField: string;
  passwordField: string;
  tokenPath: string;
}

export interface LoadForm extends Omit<LoadConfig, 'stages'> {
  stages: StageRow[];
}

export interface TestForm {
  name: string;
  baseUrl: string;
  auth: AuthForm;
  headers: HeaderRow[];
  steps: StepForm[];
  dataText: string;
  dataMode: DataMode;
  testType: TestType;
  load: LoadForm;
  thresholds: ThresholdRow[];
}

export function newStep(partial: Partial<StepForm> = {}): StepForm {
  return {
    id: uid(),
    name: 'Request',
    method: 'GET',
    path: '/',
    headers: [],
    body: '',
    extract: [],
    checks: [{ id: uid(), type: 'status', value: '200' }],
    think: '',
    useAuth: true,
    ...partial
  };
}

export function emptyAuth(): AuthForm {
  return {
    type: 'none', token: '', headerName: 'X-API-Key', apiKey: '', username: '', password: '',
    loginPath: '/auth/login', usernameField: 'username', passwordField: 'password', tokenPath: '$.token'
  };
}

export function withIds<T extends object>(list: T[]): (T & { id: string })[] {
  return list.map((x) => ({ ...x, id: uid() }));
}

/** Apply the users, duration and thresholds of a test type to a form. */
export function applyTestType(form: TestForm, type: TestType): TestForm {
  const preset = presetFor(type);
  if (!preset) return { ...form, testType: 'custom' };
  return {
    ...form,
    testType: type,
    load: { ...preset.load, stages: withIds(preset.load.stages) },
    thresholds: withIds(preset.thresholds)
  };
}

export function emptyForm(): TestForm {
  const base: TestForm = {
    name: 'My API test',
    baseUrl: '',
    auth: emptyAuth(),
    headers: [{ id: uid(), k: 'Accept', v: 'application/json', on: true }],
    steps: [newStep({ name: 'Check API', path: '/' })],
    dataText: '',
    dataMode: 'sequential',
    testType: 'smoke',
    load: { mode: 'iterations', vus: 1, iterations: 5, duration: '30s', rate: 5, stages: [], think: 0 },
    thresholds: []
  };
  return applyTestType(base, 'smoke');
}

const rowsToRecord = (rows: HeaderRow[]): Record<string, string> => {
  const out: Record<string, string> = {};
  rows.filter((r) => r.on && r.k.trim()).forEach((r) => { out[r.k.trim()] = r.v; });
  return out;
};

/* ---------------- test data (CSV or JSON) ---------------- */

export interface ParsedData {
  rows: Record<string, string>[];
  columns: string[];
  error?: string;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseDataText(text: string): ParsedData {
  const t = text.trim();
  if (!t) return { rows: [], columns: [] };
  try {
    if (t.startsWith('[')) {
      const arr: unknown = JSON.parse(t);
      if (!Array.isArray(arr) || arr.some((r) => typeof r !== 'object' || r === null || Array.isArray(r))) {
        return { rows: [], columns: [], error: 'JSON data must be a list of objects, for example [{"email":"a@x.com"}].' };
      }
      const rows = arr.map((r) => {
        const row: Record<string, string> = {};
        Object.entries(r as Record<string, unknown>).forEach(([k, v]) => { row[k] = String(v ?? ''); });
        return row;
      });
      return { rows, columns: Array.from(new Set(rows.flatMap((r) => Object.keys(r)))) };
    }
    const lines = t.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { rows: [], columns: [], error: 'CSV needs a header line and at least one row.' };
    const columns = splitCsvLine(lines[0]);
    if (columns.some((c) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(c))) {
      return { rows: [], columns: [], error: 'Column names may only use letters, numbers and _ (the first line is the header).' };
    }
    const rows = lines.slice(1).map((line) => {
      const cells = splitCsvLine(line);
      const row: Record<string, string> = {};
      columns.forEach((c, i) => { row[c] = cells[i] ?? ''; });
      return row;
    });
    return { rows, columns };
  } catch (e) {
    return { rows: [], columns: [], error: 'The data could not be read: ' + (e instanceof Error ? e.message : 'invalid format') };
  }
}

/* ---------------- form <-> request ---------------- */

export function buildRequest(form: TestForm, confirmRemote = false): RunRequest {
  const a = form.auth;
  const parsed = parseDataText(form.dataText);
  const config: RunConfig = {
    name: form.name.trim() || 'Untitled test',
    testType: form.testType,
    baseUrl: form.baseUrl.trim(),
    headers: rowsToRecord(form.headers),
    auth: {
      type: a.type,
      ...(a.type === 'apikey' ? { headerName: a.headerName } : {}),
      ...(a.type === 'basic' ? { username: a.username } : {}),
      ...(a.type === 'login'
        ? { loginPath: a.loginPath, username: a.username, usernameField: a.usernameField, passwordField: a.passwordField, tokenPath: a.tokenPath }
        : {})
    },
    steps: form.steps.map((s) => ({
      name: s.name,
      method: s.method,
      path: s.path,
      headers: rowsToRecord(s.headers),
      body: s.body,
      extract: s.extract.map(({ name, path }) => ({ name, path })),
      checks: s.checks.map(({ type, path, value }) => ({ type, path, value })),
      think: s.think.trim() === '' ? undefined : Number(s.think),
      useAuth: s.useAuth
    })),
    data: parsed.rows.length ? { rows: parsed.rows, mode: form.dataMode } : undefined,
    load: { ...form.load, stages: form.load.stages.map(({ duration, target }) => ({ duration, target })) },
    thresholds: form.thresholds.map(({ metric, stat, op, value, abort }) => ({ metric, stat, op, value, abort }))
  };
  return {
    config,
    secrets: {
      token: a.type === 'bearer' ? a.token : undefined,
      apiKey: a.type === 'apikey' ? a.apiKey : undefined,
      password: a.type === 'basic' || a.type === 'login' ? a.password : undefined
    },
    confirmRemote
  };
}

const toRows = (rec: Record<string, string>): HeaderRow[] => Object.entries(rec).map(([k, v]) => ({ id: uid(), k, v, on: true }));

/** Rebuild a form from a saved config (for "Run again"). Secrets are never stored, so they come back empty. */
export function formFromConfig(c: RunConfig): TestForm {
  const auth = emptyAuth();
  auth.type = c.auth.type;
  if (c.auth.headerName) auth.headerName = c.auth.headerName;
  if (c.auth.username) auth.username = c.auth.username;
  if (c.auth.loginPath) auth.loginPath = c.auth.loginPath;
  if (c.auth.usernameField) auth.usernameField = c.auth.usernameField;
  if (c.auth.passwordField) auth.passwordField = c.auth.passwordField;
  if (c.auth.tokenPath) auth.tokenPath = c.auth.tokenPath;
  const dataText = c.data ? JSON.stringify(c.data.rows, null, 2) : '';
  return {
    name: c.name,
    baseUrl: c.baseUrl,
    auth,
    headers: toRows(c.headers),
    steps: c.steps.map((s) => newStep({
      name: s.name, method: s.method, path: s.path, body: s.body, useAuth: s.useAuth,
      headers: toRows(s.headers), extract: withIds(s.extract), checks: withIds(s.checks),
      think: s.think === undefined ? '' : String(s.think)
    })),
    dataText,
    dataMode: c.data?.mode ?? 'sequential',
    testType: c.testType,
    load: { ...c.load, stages: withIds(c.load.stages) },
    thresholds: withIds(c.thresholds)
  };
}
