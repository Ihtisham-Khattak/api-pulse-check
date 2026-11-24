import path from 'node:path';

// The web app lives in <project>/web, the k6 scripts and reports one level up.
// Set PULSECHECK_ROOT to override when the app is started from somewhere else.
export const PROJECT_ROOT = path.resolve(process.env.PULSECHECK_ROOT || path.join(/* turbopackIgnore: true */ process.cwd(), '..'));
export const RUNS_DIR = path.join(PROJECT_ROOT, 'reports', 'runs');
export const RUNNER_SCRIPT = path.join(PROJECT_ROOT, 'tests', 'generic-runner.js');

export const RUN_ID_RE = /^r-[a-z0-9]{6,12}-[a-z0-9]{4,8}$/;

export function isRunId(id: string): boolean {
  return RUN_ID_RE.test(id);
}

/** Resolve a run folder. Throws for anything that is not a well-formed run id (blocks path traversal). */
export function runDir(id: string): string {
  if (!isRunId(id)) throw new Error('Invalid run id');
  return path.join(RUNS_DIR, id);
}

export function newRunId(): string {
  const rand = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  return `r-${Date.now().toString(36)}-${rand}`;
}
