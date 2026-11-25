'use client';

import { Ban, CircleCheck, CircleX, Globe, Info, KeyRound, LoaderCircle, Lock, LogIn, ShieldCheck, TriangleAlert, UserRound, Wifi, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AuthType, ProbeResult } from '@/lib/types';
import { IconBadge, Segmented } from '../ui';
import { HeaderTable, SecretInput, type StepProps } from './shared';

const AUTH_OPTIONS: { value: AuthType; label: string; icon: LucideIcon }[] = [
  { value: 'none', label: 'None', icon: Ban },
  { value: 'bearer', label: 'Bearer token', icon: KeyRound },
  { value: 'apikey', label: 'API key', icon: Lock },
  { value: 'basic', label: 'Basic', icon: UserRound },
  { value: 'login', label: 'Log in first', icon: LogIn }
];

const QUICK_URLS = [
  { label: 'localhost:5000', url: 'http://localhost:5000' },
  { label: 'localhost:8000', url: 'http://localhost:8000' },
  { label: 'localhost:8080', url: 'http://localhost:8080' },
  { label: 'DummyJSON demo', url: 'https://dummyjson.com' }
];

function urlProblem(value: string): string | null {
  if (!value.trim()) return 'Enter the address of your API.';
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'The address must start with http:// or https://';
    return null;
  } catch {
    return 'This does not look like a full address. Example: http://localhost:8080';
  }
}

export function TargetStep({ form, setForm }: StepProps) {
  const a = form.auth;
  const setAuth = (p: Partial<typeof a>) => setForm((f) => ({ ...f, auth: { ...f.auth, ...p } }));
  const problem = urlProblem(form.baseUrl);
  const [probe, setProbe] = useState<ProbeResult | 'loading' | { error: string } | null>(null);

  // A result belongs to the address it was measured for.
  useEffect(() => { setProbe(null); }, [form.baseUrl]);

  const testConnection = async () => {
    setProbe('loading');
    try { setProbe(await api.check(form.baseUrl)); } catch (e) { setProbe({ error: (e as Error).message }); }
  };

  return (
    <div className="stack">
      <section className="card" aria-labelledby="t-target">
        <div className="row" style={{ marginBottom: 16 }}>
          <IconBadge icon={Globe} tone="grey" />
          <div><h2 id="t-target">Where is your API?</h2><p className="muted small">Any address works, including a site running on this computer.</p></div>
        </div>
        <div className="stack">
          <label className="field">Test name
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} />
          </label>
          <label className="field">Base URL
            <span className="input-wrap">
              <Globe size={16} className="lead" aria-hidden="true" />
              <input value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} spellCheck={false} autoComplete="off" placeholder="http://localhost:8080" aria-invalid={problem ? true : undefined} />
            </span>
            {problem ? <span className="validity bad">{problem}</span> : <span className="hint">Request paths such as /api/orders are added to this address.</span>}
          </label>
          <div className="stack-sm">
            <div className="row">
              <button type="button" className="btn sm" onClick={testConnection} disabled={!!problem || probe === 'loading'}>
                {probe === 'loading' ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Wifi size={15} aria-hidden="true" />} Test connection
              </button>
              <span className="hint">Checks that something answers at this address, and what it is.</span>
            </div>
            {probe && probe !== 'loading' && (
              'error' in probe
                ? <div className="note bad" role="status"><CircleX size={17} aria-hidden="true" /><span>{probe.error}</span></div>
                : <div className={`note${probe.kind === 'warn' ? ' warn' : probe.kind === 'error' ? ' bad' : ''}`} role="status">
                    {probe.kind === 'ok' ? <CircleCheck size={17} aria-hidden="true" /> : probe.kind === 'warn' ? <TriangleAlert size={17} aria-hidden="true" /> : <CircleX size={17} aria-hidden="true" />}
                    <span>{probe.message}</span>
                  </div>
            )}
          </div>
          <div>
            <div className="muted small" style={{ marginBottom: 6 }}>Quick pick</div>
            <div className="chips">
              {QUICK_URLS.map((q) => (<button key={q.url} type="button" className="chip" onClick={() => setForm((f) => ({ ...f, baseUrl: q.url }))}>{q.label}</button>))}
            </div>
          </div>
          <div className="note">
            <Info size={17} aria-hidden="true" />
            <span>Pulsar runs k6 on <b>your computer</b>, so <span className="mono">localhost</span> means the site running here. Make sure your site is started before you run the test.</span>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="t-auth">
        <div className="row" style={{ marginBottom: 16 }}>
          <IconBadge icon={KeyRound} tone="grey" />
          <div><h2 id="t-auth">Authentication</h2><p className="muted small">How does your API know who is calling?</p></div>
        </div>
        <div className="stack">
          <Segmented<AuthType> label="Authentication type" value={a.type} options={AUTH_OPTIONS} onChange={(type) => setAuth({ type })} />

          {a.type === 'none' && <p className="muted small">No credentials will be sent. Add headers below if you need something custom.</p>}

          {a.type === 'bearer' && (
            <SecretInput label="Token" value={a.token} onChange={(token) => setAuth({ token })} placeholder="Paste your token" />
          )}

          {a.type === 'apikey' && (
            <div className="row end">
              <label className="field" style={{ width: 220 }}>Header name<input value={a.headerName} onChange={(e) => setAuth({ headerName: e.target.value })} spellCheck={false} /></label>
              <div className="grow"><SecretInput label="Key" value={a.apiKey} onChange={(apiKey) => setAuth({ apiKey })} /></div>
            </div>
          )}

          {a.type === 'basic' && (
            <div className="row end">
              <label className="field grow">Username<input value={a.username} onChange={(e) => setAuth({ username: e.target.value })} autoComplete="off" /></label>
              <div className="grow"><SecretInput label="Password" value={a.password} onChange={(password) => setAuth({ password })} /></div>
            </div>
          )}

          {a.type === 'login' && (
            <div className="stack">
              <p className="muted small">Use this when tokens expire. Pulsar calls your login endpoint once before the test and sends the token it gets back with every request.</p>
              <div className="row end">
                <label className="field grow">Login path<input value={a.loginPath} onChange={(e) => setAuth({ loginPath: e.target.value })} spellCheck={false} placeholder="/auth/login" /></label>
                <label className="field grow">Token location in the response<input value={a.tokenPath} onChange={(e) => setAuth({ tokenPath: e.target.value })} spellCheck={false} placeholder="$.accessToken" /></label>
              </div>
              <div className="row end">
                <label className="field grow">Username field<input value={a.usernameField} onChange={(e) => setAuth({ usernameField: e.target.value })} spellCheck={false} /></label>
                <label className="field grow">Username<input value={a.username} onChange={(e) => setAuth({ username: e.target.value })} autoComplete="off" /></label>
              </div>
              <div className="row end">
                <label className="field grow">Password field<input value={a.passwordField} onChange={(e) => setAuth({ passwordField: e.target.value })} spellCheck={false} /></label>
                <div className="grow"><SecretInput label="Password" value={a.password} onChange={(password) => setAuth({ password })} /></div>
              </div>
            </div>
          )}

          {a.type !== 'none' && (
            <div className="note">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>Secrets stay in memory for this run only. They are handed to k6 privately and are <b>never saved</b> to history, reports or logs.</span>
            </div>
          )}
        </div>
      </section>

      <section className="card" aria-labelledby="t-headers">
        <h2 id="t-headers">Headers for every request</h2>
        <p className="muted small" style={{ margin: '4px 0 14px' }}>Optional. For example a tenant id or a custom version header.</p>
        <HeaderTable rows={form.headers} onChange={(headers) => setForm((f) => ({ ...f, headers }))} label="Header" />
      </section>
    </div>
  );
}
