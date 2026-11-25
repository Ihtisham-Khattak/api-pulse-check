// Report output for runs started from the web UI. It uses the bundled copy of
// k6-reporter, so it never has to download anything.
import { htmlReport } from './vendor/k6-reporter-3.0.4.js';

function ms(v) {
    return typeof v === 'number' ? (v >= 1000 ? (v / 1000).toFixed(2) + 's' : v.toFixed(1) + 'ms') : '-';
}

function shortSummary(data) {
    const m = data.metrics || {};
    const lines = ['', 'Pulsar summary'];
    if (m.checks) lines.push(`  checks .......... ${(m.checks.values.rate * 100).toFixed(2)}%  (${m.checks.values.passes} passed, ${m.checks.values.fails} failed)`);
    if (m.http_reqs) lines.push(`  requests ........ ${m.http_reqs.values.count}  (${m.http_reqs.values.rate.toFixed(1)}/s)`);
    if (m.http_req_failed) lines.push(`  failed requests . ${(m.http_req_failed.values.rate * 100).toFixed(2)}%`);
    if (m.http_req_duration) {
        const d = m.http_req_duration.values;
        lines.push(`  response time ... avg ${ms(d.avg)}  p90 ${ms(d['p(90)'])}  p95 ${ms(d['p(95)'])}  p99 ${ms(d['p(99)'])}  max ${ms(d.max)}`);
    }
    Object.keys(m).forEach((name) => {
        const th = m[name].thresholds;
        if (!th || name.indexOf('{') !== -1) return;
        Object.keys(th).forEach((expr) => lines.push(`  rule ${th[expr].ok ? 'passed' : 'FAILED'} .... ${name} ${expr}`));
    });
    lines.push('');
    return lines.join('\n');
}

export function buildUiReport(data) {
    const dir = 'reports/runs/' + (__ENV.RUN_ID || 'manual');
    return {
        [dir + '/report.html']: htmlReport(data, { title: 'Pulsar report' }),
        [dir + '/summary.json']: JSON.stringify(data, null, 2),
        stdout: shortSummary(data)
    };
}
