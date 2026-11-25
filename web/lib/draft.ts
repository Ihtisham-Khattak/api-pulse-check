// A "draft" is the test the user is building. It is kept in sessionStorage (this
// browser tab only, gone when the tab closes) so that moving between steps or
// refreshing the page does not lose their work.
//
// Rules:
//  - Tokens, API keys and passwords are NEVER stored. They stay in memory.
//  - The three steps own separate slices of the form. After a page refresh, only
//    the slice of the step the user is on goes back to its defaults.
import type { TestForm } from './form';

export type StepNo = 1 | 2 | 3;

const KEY = 'pulsar:draft:v1';

interface DraftRecord {
  v: 1;
  /** Which test this draft belongs to: "blank", "template:<id>" or "from:<runId>". */
  origin: string;
  /** Identifies one document load, so a refresh can be told apart from in-app navigation. */
  bootId: number;
  savedAt: number;
  form: TestForm;
}

declare global {
  interface Window { __pulsarBoot?: number }
}

/** Changes on every full page load, survives hot reload and in-app navigation. */
export function bootId(): number {
  return (window.__pulsarBoot ??= Date.now());
}

export function stripSecrets(form: TestForm): TestForm {
  return { ...form, auth: { ...form.auth, token: '', apiKey: '', password: '' } };
}

/** The part of the form each step is responsible for. */
export function sliceOf(form: TestForm, step: StepNo): Partial<TestForm> {
  if (step === 1) return { name: form.name, baseUrl: form.baseUrl, auth: form.auth, headers: form.headers };
  if (step === 2) return { steps: form.steps, dataText: form.dataText, dataMode: form.dataMode };
  return { testType: form.testType, load: form.load, thresholds: form.thresholds };
}

/** Put one step's fields back to their defaults and leave the others alone. */
export function resetStep(form: TestForm, defaults: TestForm, step: StepNo): TestForm {
  return { ...form, ...sliceOf(defaults, step) };
}

function looksValid(f: unknown): f is TestForm {
  const x = f as Partial<TestForm> | null;
  return !!x && typeof x.baseUrl === 'string' && typeof x.name === 'string'
    && Array.isArray(x.steps) && x.steps.length > 0 && Array.isArray(x.headers)
    && !!x.auth && !!x.load && Array.isArray(x.load.stages) && Array.isArray(x.thresholds);
}

export function loadDraft(origin: string): DraftRecord | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as DraftRecord;
    if (rec.v !== 1 || rec.origin !== origin || !looksValid(rec.form)) return null;
    return rec;
  } catch {
    return null;
  }
}

export function saveDraft(origin: string, form: TestForm): void {
  try {
    const rec: DraftRecord = { v: 1, origin, bootId: bootId(), savedAt: Date.now(), form: stripSecrets(form) };
    sessionStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    // Storage can be blocked or full. The app keeps working, just without refresh protection.
  }
}

export function clearDraft(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function stepFromHash(hash: string): StepNo | null {
  const m = /^#step-([123])$/.exec(hash);
  return m ? (Number(m[1]) as StepNo) : null;
}

/** True when the form holds a token, key or password. */
export function hasSecrets(form: TestForm): boolean {
  return !!(form.auth.token || form.auth.apiKey || form.auth.password);
}
