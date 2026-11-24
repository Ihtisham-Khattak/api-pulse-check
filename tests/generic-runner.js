// Generic, config-driven k6 test. The PulseCheck web UI writes a JSON config
// (no secrets) and passes its path in PC_CONFIG_FILE. Secrets (tokens, API keys,
// passwords) arrive separately in the PC_SECRETS environment variable.
//
// Manual use:
//   PC_CONFIG_FILE=/abs/path/config.json k6 run tests/generic-runner.js
import http from 'k6/http';
import exec from 'k6/execution';
import encoding from 'k6/encoding';
import { check, sleep, fail } from 'k6';
import { SharedArray } from 'k6/data';
import { buildUiReport } from '../utils/ui-report.js';

const cfg = JSON.parse(open(__ENV.PC_CONFIG_FILE));
const secrets = JSON.parse(__ENV.PC_SECRETS || '{}');
const baseUrl = String(cfg.baseUrl).replace(/\/+$/, '');

const rows = new SharedArray('pulsecheck-data', function () {
    return (cfg.data && cfg.data.rows) || [];
});

/* ---------------- options ---------------- */

function buildOptions() {
    const load = cfg.load;
    const options = {
        summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)']
    };

    if (load.mode === 'iterations') {
        options.vus = load.vus;
        options.iterations = Math.max(load.iterations, load.vus);
    } else if (load.mode === 'simple') {
        options.vus = load.vus;
        options.duration = load.duration;
    } else if (load.mode === 'stages') {
        options.stages = load.stages.map((s) => ({ duration: s.duration, target: s.target }));
    } else if (load.mode === 'rate') {
        options.scenarios = {
            constant_rate: {
                executor: 'constant-arrival-rate',
                rate: load.rate,
                timeUnit: '1s',
                duration: load.duration,
                preAllocatedVUs: Math.min(Math.max(load.rate, 10), 500),
                maxVUs: Math.min(Math.max(load.rate * 5, 50), 1000)
            }
        };
    }

    const thresholds = {};
    (cfg.thresholds || []).forEach((t) => {
        const expr = `${t.stat}${t.op}${t.value}`;
        const entry = t.abort ? { threshold: expr, abortOnFail: true, delayAbortEval: '5s' } : expr;
        (thresholds[t.metric] = thresholds[t.metric] || []).push(entry);
    });
    options.thresholds = thresholds;

    return options;
}

export const options = buildOptions();

/* ---------------- helpers ---------------- */

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// Replaces {{$randomInt}}, {{$uuid}}, {{$timestamp}}, {{$randomEmail}},
// {{vars.name}} (saved from an earlier step) and {{data.field}} (data file row).
function render(text, ctx) {
    return String(text).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (whole, key) => {
        if (key === '$randomInt') return String(Math.floor(Math.random() * 1000000));
        if (key === '$uuid') return uuid();
        if (key === '$timestamp') return String(Date.now());
        if (key === '$randomEmail') return 'user' + Math.floor(Math.random() * 1000000) + '@example.com';
        if (key.indexOf('vars.') === 0) {
            const v = ctx.vars[key.slice(5)];
            return v === undefined || v === null ? '' : String(v);
        }
        if (key.indexOf('data.') === 0) {
            const v = ctx.data ? ctx.data[key.slice(5)] : undefined;
            return v === undefined || v === null ? '' : String(v);
        }
        return whole;
    });
}

// Reads a value from parsed JSON using a path such as $.user.id or items[0].name
function getPath(obj, path) {
    if (obj === null || obj === undefined) return undefined;
    const tokens = String(path).replace(/^\$\.?/, '').match(/[^.[\]]+/g) || [];
    let cur = obj;
    for (const tok of tokens) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[tok];
    }
    return cur;
}

function parseJson(res) {
    try {
        return JSON.parse(res.body);
    } catch (e) {
        return null;
    }
}

function pickRow() {
    if (!rows.length) return null;
    const mode = (cfg.data && cfg.data.mode) || 'sequential';
    if (mode === 'random') return rows[Math.floor(Math.random() * rows.length)];
    if (mode === 'per-vu') return rows[(exec.vu.idInTest - 1) % rows.length];
    return rows[exec.scenario.iterationInTest % rows.length];
}

function authHeaders(token) {
    const a = cfg.auth || { type: 'none' };
    if (a.type === 'bearer') return { Authorization: 'Bearer ' + (secrets.token || '') };
    if (a.type === 'apikey') return { [a.headerName || 'X-API-Key']: secrets.apiKey || '' };
    if (a.type === 'basic') return { Authorization: 'Basic ' + encoding.b64encode((a.username || '') + ':' + (secrets.password || '')) };
    if (a.type === 'login' && token) return { Authorization: 'Bearer ' + token };
    return {};
}

// Per virtual user: how many failing responses have been reported so far.
let reportedProblems = 0;

function reportProblem(step, method, url, res) {
    if (reportedProblems >= 2) return;
    reportedProblems += 1;
    const what = res.status === 0
        ? 'no response (' + String(res.error || 'connection failed').slice(0, 160) + ')'
        : 'HTTP ' + res.status + ' ' + String(res.body || '').slice(0, 140).replace(/\s+/g, ' ');
    console.warn('[PulseCheck] ' + step.name + ': ' + method + ' ' + url + ' -> ' + what);
}

/* ---------------- lifecycle ---------------- */

export function setup() {
    const a = cfg.auth || { type: 'none' };
    if (a.type !== 'login') return { token: null };

    const res = http.post(
        baseUrl + a.loginPath,
        JSON.stringify({
            [a.usernameField || 'username']: a.username,
            [a.passwordField || 'password']: secrets.password || ''
        }),
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, tags: { name: 'login (setup)' } }
    );

    const token = getPath(parseJson(res), a.tokenPath || '$.token');
    if (res.status < 200 || res.status >= 300 || !token) {
        fail('Login failed with status ' + res.status + '. Check the login path, credentials and token location.');
    }
    return { token: String(token) };
}

export default function (data) {
    const ctx = { vars: {}, data: pickRow() };

    for (const step of cfg.steps) {
        const method = step.method;
        const url = baseUrl + render(step.path, ctx);

        const headers = Object.assign({ Accept: 'application/json' }, cfg.headers || {});
        Object.keys(step.headers || {}).forEach((k) => { headers[k] = render(step.headers[k], ctx); });
        Object.keys(headers).forEach((k) => { headers[k] = render(headers[k], ctx); });
        if (step.useAuth !== false) Object.assign(headers, authHeaders(data && data.token));

        let body = null;
        if (step.body && method !== 'GET' && method !== 'DELETE') {
            body = render(step.body, ctx);
            if (!Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
                headers['Content-Type'] = 'application/json';
            }
        }

        const res = http.request(method, url, body, { headers: headers, tags: { name: step.name } });
        if (res.status === 0 || res.status >= 400) reportProblem(step, method, url, res);
        const json = parseJson(res);

        const checks = {};
        (step.checks || []).forEach((c) => {
            const expected = c.value === undefined ? '' : render(c.value, ctx);
            if (c.type === 'status') {
                checks[step.name + ': status is ' + expected] = (r) => r.status === Number(expected);
            } else if (c.type === 'json') {
                checks[step.name + ': ' + c.path + ' equals ' + expected] = () => String(getPath(json, c.path)) === expected;
            } else if (c.type === 'exists') {
                checks[step.name + ': ' + c.path + ' exists'] = () => {
                    const v = getPath(json, c.path);
                    return v !== undefined && v !== null;
                };
            } else if (c.type === 'contains') {
                checks[step.name + ': body contains "' + expected + '"'] = (r) => String(r.body).indexOf(expected) !== -1;
            } else if (c.type === 'time') {
                checks[step.name + ': responds under ' + expected + ' ms'] = (r) => r.timings.duration < Number(expected);
            }
        });

        (step.extract || []).forEach((ex) => {
            const value = getPath(json, ex.path);
            ctx.vars[ex.name] = value;
            checks[step.name + ': saved "' + ex.name + '"'] = () => value !== undefined && value !== null;
        });

        if (Object.keys(checks).length) check(res, checks);

        const wait = Number(step.think !== undefined && step.think !== null ? step.think : cfg.load.think) || 0;
        if (wait > 0) sleep(wait);
    }
}

export function handleSummary(data) {
    return buildUiReport(data);
}
