import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

export function generateReport(data, testName) {
    // When the web UI starts a run it sets RUN_ID, and every run gets its own
    // folder so reports are never overwritten. The CLI keeps the old layout.
    const runId = __ENV.RUN_ID;
    const htmlPath = runId ? `reports/runs/${runId}/report.html` : `reports/${testName}.html`;
    const jsonPath = runId ? `reports/runs/${runId}/summary.json` : `reports/${testName}.json`;

    return {
        [htmlPath]: htmlReport(data, {
            title: `Pulsar - ${testName} Report`
        }),

        [jsonPath]: JSON.stringify(data, null, 2),

        stdout: textSummary(data, {
            indent: ' ',
            enableColors: !runId
        })
    };
}
