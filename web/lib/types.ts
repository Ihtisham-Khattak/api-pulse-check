// Types shared by the browser and the server. Keep this file pure (no fs, no process).

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuthType = 'none' | 'bearer' | 'apikey' | 'basic' | 'login';
export type TestType = 'smoke' | 'load' | 'stress' | 'spike' | 'soak' | 'custom';
export type LoadMode = 'iterations' | 'simple' | 'stages' | 'rate';
export type DataMode = 'sequential' | 'random' | 'per-vu';
export type CheckType = 'status' | 'json' | 'exists' | 'contains' | 'time';

export interface CheckDef {
  type: CheckType;
  path?: string;
  value?: string;
}

export interface ExtractDef {
  name: string;
  path: string;
}

export interface StepDef {
  name: string;
  method: Method;
  path: string;
  headers: Record<string, string>;
  body: string;
  extract: ExtractDef[];
  checks: CheckDef[];
  /** Seconds to wait after the step. Omitted means "use the test default". */
  think?: number;
  useAuth: boolean;
}

export interface AuthConfig {
  type: AuthType;
  headerName?: string;
  username?: string;
  loginPath?: string;
  usernameField?: string;
  passwordField?: string;
  tokenPath?: string;
}

/** Never stored, never logged. Passed to k6 through an environment variable. */
export interface Secrets {
  token?: string;
  apiKey?: string;
  password?: string;
}

export interface StageDef {
  duration: string;
  target: number;
}

export interface LoadConfig {
  mode: LoadMode;
  vus: number;
  duration: string;
  iterations: number;
  rate: number;
  stages: StageDef[];
  /** Default seconds to wait after each step. */
  think: number;
}

export interface ThresholdDef {
  metric: string;
  stat: string;
  op: string;
  value: number;
  abort: boolean;
}

export interface DataConfig {
  rows: Record<string, string>[];
  mode: DataMode;
}

export interface RunConfig {
  name: string;
  testType: TestType;
  baseUrl: string;
  headers: Record<string, string>;
  auth: AuthConfig;
  steps: StepDef[];
  data?: DataConfig;
  load: LoadConfig;
  thresholds: ThresholdDef[];
}

export interface RunRequest {
  config: RunConfig;
  secrets: Secrets;
  /** Must be true to run a heavy test against a host that is not local or a known demo API. */
  confirmRemote?: boolean;
}

export type RunStatus = 'running' | 'passed' | 'failed' | 'stopped' | 'error';

export interface Kpis {
  reqs: number;
  rps: number;
  failedRate: number;
  avg: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  secs: number;
  iterations: number;
  checksRate: number;
}

export interface RunMeta {
  id: string;
  name: string;
  testType: TestType;
  baseUrl: string;
  status: RunStatus;
  startedAt: number;
  endedAt?: number;
  exitCode?: number | null;
  expectedSecs: number;
  kpis?: Kpis;
  error?: string;
  logTail?: string[];
  /** First few failing requests k6 reported, in plain text. */
  problems?: string[];
}

export interface ThresholdResult {
  metric: string;
  expr: string;
  stat: string;
  op: string;
  limit: number;
  actual: number | null;
  ok: boolean;
}

export interface CheckResult {
  name: string;
  passes: number;
  fails: number;
}

export interface Sample {
  /** Seconds since the run started. */
  t: number;
  vus: number;
  rps: number;
  avg: number;
  p95: number;
  errRate: number;
}

export interface RunResult {
  meta: RunMeta;
  config: RunConfig;
  thresholds: ThresholdResult[];
  checks: CheckResult[];
  series: Sample[];
  hasReport: boolean;
}

/** Messages sent over Server-Sent Events while a run is active. */
export interface RunSnapshot {
  meta: RunMeta;
  series: Sample[];
  log: string[];
  totals: { reqs: number; failed: number; iterations: number };
}

export interface HealthInfo {
  ok: boolean;
  k6: { found: boolean; version?: string };
  activeRunId: string | null;
}

export type ProbeKind = 'ok' | 'warn' | 'error';

export interface ProbeResult {
  kind: ProbeKind;
  reachable: boolean;
  status?: number;
  contentType?: string;
  server?: string;
  ms: number;
  message: string;
}
