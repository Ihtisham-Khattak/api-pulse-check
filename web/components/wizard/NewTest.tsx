'use client';

import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, Info, LoaderCircle, Play, RotateCcw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { clearDraft, hasSecrets, loadDraft, resetStep, saveDraft, stepFromHash, bootId, type StepNo } from '@/lib/draft';
import { buildRequest, emptyForm, formFromConfig, type TestForm } from '@/lib/form';
import { estimateRun, fmtDur, isHeavy, isSafeHost } from '@/lib/format';
import { getTemplate } from '@/lib/templates';
import { validateRunRequest } from '@/lib/validate';
import { useFeedback } from '../Feedback';
import { RequestsStep } from './RequestsStep';
import { TargetStep } from './TargetStep';
import { TypeStep } from './TypeStep';

const STEPS = [
  { n: 1, label: 'Target' },
  { n: 2, label: 'Requests' },
  { n: 3, label: 'Test type' }
] as const;

interface NewTestProps {
  templateId?: string;
  fromId?: string;
}

function initialForm(templateId?: string): TestForm {
  const tpl = templateId ? getTemplate(templateId) : undefined;
  return tpl ? tpl.build() : emptyForm();
}

export function NewTest({ templateId, fromId }: NewTestProps) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const origin = fromId ? `from:${fromId}` : templateId ? `template:${templateId}` : 'blank';
  const defaultStep: StepNo = templateId || fromId ? 2 : 1;

  const [form, setForm] = useState<TestForm>(() => initialForm(templateId));
  const [step, setStep] = useState<StepNo>(defaultStep);
  const [selStepId, setSelStepId] = useState('');
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [restoredNote, setRestoredNote] = useState(false);
  const [secretsNote, setSecretsNote] = useState(false);
  const template = templateId ? getTemplate(templateId) : undefined;

  // Latest values for the "page is closing" save, which cannot wait for React.
  const latest = useRef({ form, ready });
  latest.current = { form, ready };

  /* Restore the draft once, in the browser. Steps other than the current one keep their
     data. After a real page refresh, only the current step goes back to its defaults. */
  useEffect(() => {
    let alive = true;
    const urlStep = stepFromHash(window.location.hash) ?? defaultStep;
    setStep(urlStep);
    const draft = loadDraft(origin);

    if (draft) {
      const refreshed = draft.bootId !== bootId();
      const next = refreshed ? resetStep(draft.form, initialForm(templateId), urlStep) : draft.form;
      setForm(next);
      setSecretsNote(refreshed && draft.form.auth.type !== 'none');
      setReady(true);
    } else if (fromId) {
      api.run(fromId)
        .then((r) => { if (alive) { setForm(formFromConfig(r.config)); setRestoredNote(true); } })
        .catch((e: Error) => { if (alive) toast(e.message, 'error'); })
        .finally(() => { if (alive) setReady(true); });
    } else {
      setReady(true);
    }
    return () => { alive = false; };
  }, [origin, fromId, templateId, defaultStep, toast]);

  /* Save the draft shortly after every change, and again when the page closes. */
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => saveDraft(origin, form), 250);
    return () => window.clearTimeout(timer);
  }, [form, ready, origin]);

  useEffect(() => {
    const flush = () => { if (latest.current.ready) saveDraft(origin, latest.current.form); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [origin]);

  /* The step lives in the URL hash (#step-2), so refresh keeps it and the browser's
     Back and Forward buttons move between steps. */
  useEffect(() => {
    const sync = () => setStep(stepFromHash(window.location.hash) ?? defaultStep);
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, [defaultStep]);

  // pushState (not location.hash) so Next.js's router keeps its own history entries intact.
  const stepUrl = (n: StepNo) => `${window.location.pathname}${window.location.search}#step-${n}`;

  const goStep = useCallback((n: StepNo) => {
    if (n === step) return;
    window.history.pushState(null, '', stepUrl(n));
    setStep(n);
    window.scrollTo({ top: 0 });
  }, [step]);

  // The token note goes away as soon as the user enters a secret or no longer needs one.
  useEffect(() => {
    if (secretsNote && (form.auth.type === 'none' || hasSecrets(form))) setSecretsNote(false);
  }, [secretsNote, form]);

  const startOver = async () => {
    const ok = await confirm({
      title: 'Start over?',
      body: 'This clears everything you entered in all three steps and goes back to the beginning.',
      confirmLabel: 'Start over',
      danger: true
    });
    if (!ok) return;
    clearDraft();
    setForm(initialForm(templateId));
    setSelStepId('');
    setSecretsNote(false);
    setRestoredNote(false);
    window.history.replaceState(null, '', stepUrl(defaultStep));
    setStep(defaultStep);
    window.scrollTo({ top: 0 });
    toast('Started over.');
  };

  const request = useMemo(() => buildRequest(form), [form]);
  const validation = useMemo(() => validateRunRequest(request), [request]);
  const est = useMemo(() => estimateRun(request.config), [request]);
  const errors = validation.ok ? [] : validation.errors;

  const run = async () => {
    if (!validation.ok) { toast('Fix the problems listed on the right first.', 'error'); return; }
    let confirmRemote = false;
    if (isHeavy(request.config) && !isSafeHost(request.config.baseUrl)) {
      const ok = await confirm({
        title: 'Run a heavy test on this API?',
        body: `This sends a lot of requests to ${request.config.baseUrl}. Only continue if you own this API or have permission to load test it.`,
        confirmLabel: 'Yes, run it'
      });
      if (!ok) return;
      confirmRemote = true;
    }
    setStarting(true);
    setServerErrors([]);
    try {
      const { id } = await api.start({ ...request, confirmRemote });
      router.push(`/runs/${id}`);
    } catch (e) {
      const err = e as ApiError;
      setServerErrors(err.details ?? []);
      toast(err.message, 'error');
      setStarting(false);
    }
  };

  const heavy = isHeavy(request.config);
  const maskedSecrets = {
    token: request.secrets.token ? '••••••••' : undefined,
    apiKey: request.secrets.apiKey ? '••••••••' : undefined,
    password: request.secrets.password ? '••••••••' : undefined
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Play size={14} aria-hidden="true" /> New test</div>
          <h1>{template ? template.name : 'Build a test'}</h1>
          <p className="muted">{template ? 'Template loaded. Edit anything, or run it as it is.' : 'Three steps: where your API is, what to call, and how hard to push.'}</p>
        </div>
        <button type="button" className="btn ghost" onClick={startOver} disabled={!ready}><RotateCcw size={16} aria-hidden="true" /> Start over</button>
      </div>

      {secretsNote && (
        <div className="note warn" style={{ marginBottom: 16 }} role="status">
          <Info size={17} aria-hidden="true" />
          <span>Your entries were kept after the refresh, except <b>tokens, keys and passwords</b>. Those are never stored, so enter them again in step 1 if your API needs them.</span>
        </div>
      )}

      {restoredNote && (
        <div className="note" style={{ marginBottom: 16 }}>
          <Info size={17} aria-hidden="true" />
          <span>Settings loaded from a previous run. Tokens and passwords are never saved, so enter them again if your API needs them.</span>
        </div>
      )}

      <nav className="stepper" aria-label="Steps">
        {STEPS.map((s) => (
          <button key={s.n} type="button" className={step > s.n ? 'done' : ''} aria-current={step === s.n ? 'step' : undefined} onClick={() => goStep(s.n)}>
            <span className="num-dot">{step > s.n ? <Check size={14} aria-hidden="true" /> : s.n}</span>
            {s.label}
          </button>
        ))}
      </nav>

      <div className="layout-2">
        <div>
          {!ready ? (
            <div className="card"><p className="muted"><LoaderCircle size={16} className="spin" aria-hidden="true" /> Loading...</p></div>
          ) : (
            <>
              {step === 1 && <TargetStep form={form} setForm={setForm} />}
              {step === 2 && <RequestsStep form={form} setForm={setForm} selId={selStepId} setSelId={setSelStepId} />}
              {step === 3 && <TypeStep form={form} setForm={setForm} />}

              <div className="row between" style={{ marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => goStep(Math.max(1, step - 1) as StepNo)} disabled={step === 1}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
                {step < 3
                  ? <button type="button" className="btn primary" onClick={() => goStep(Math.min(3, step + 1) as StepNo)}>Next <ArrowRight size={16} aria-hidden="true" /></button>
                  : <button type="button" className="btn primary" onClick={run} disabled={starting || !validation.ok}>{starting ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Play size={16} aria-hidden="true" />} Run test</button>}
              </div>
            </>
          )}
        </div>

        <aside className="sticky" aria-label="Run summary">
          <div className="card">
            <h2>Run summary</h2>
            <dl className="summary-list">
              <dt>Target</dt><dd className="mono">{request.config.baseUrl.replace(/^https?:\/\//, '') || '-'}</dd>
              <dt>Requests</dt><dd>{request.config.steps.length} per iteration</dd>
              <dt>Auth</dt><dd>{{ none: 'None', bearer: 'Bearer token', apikey: 'API key', basic: 'Basic', login: 'Log in first' }[request.config.auth.type]}</dd>
              <dt>Test type</dt><dd style={{ textTransform: 'capitalize' }}>{request.config.testType}</dd>
              <dt>Duration</dt><dd>{est.secs < 1 ? 'Under 1s' : `About ${fmtDur(est.secs)}`}</dd>
              <dt>Peak users</dt><dd>{est.peakVus}</dd>
              <dt>Approx. requests</dt><dd>{Math.round(est.approxRequests).toLocaleString('en-US')}</dd>
              <dt>Rules</dt><dd>{request.config.thresholds.length}</dd>
            </dl>

            {heavy && <div className="note warn" style={{ marginTop: 14 }}><Info size={17} aria-hidden="true" /><span>Heavy test. Run it only against an API you own or may test.</span></div>}

            {(errors.length > 0 || serverErrors.length > 0) && (
              <div className="note bad" style={{ marginTop: 14 }} role="alert">
                <CircleAlert size={17} aria-hidden="true" />
                <div>
                  <b>Fix before running</b>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{(errors.length ? errors : serverErrors).map((e) => (<li key={e}>{e}</li>))}</ul>
                </div>
              </div>
            )}

            <button type="button" className="btn primary block" style={{ marginTop: 16 }} onClick={run} disabled={starting || !validation.ok || !ready}>
              {starting ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Play size={16} aria-hidden="true" />} Run test
            </button>

            <p className="hint" style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <Save size={14} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
              <span>Your entries are kept in this browser tab, so you can move between steps or refresh the page. Tokens and passwords are the exception: they are never stored.</span>
            </p>

            <details style={{ marginTop: 16 }}>
              <summary><ChevronRight size={15} className="chev" aria-hidden="true" /> What Pulsar sends to k6</summary>
              <pre className="json">{JSON.stringify({ ...request.config, secrets: maskedSecrets }, null, 2)}</pre>
            </details>
          </div>
        </aside>
      </div>
    </>
  );
}
