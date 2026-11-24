---
name: pulsecheck-k6-tests
description: Conventions for writing, changing or adding k6 test scripts in PulseCheck (tests/, utils/, config/, data/). Use whenever a k6 test, threshold profile, shared helper or test-data file is created or edited.
---

# Writing PulseCheck k6 tests

PulseCheck is a k6 (JavaScript, ES modules) API performance framework. Tests live in `tests/`, shared code in `utils/`, settings in `config/`, inputs in `data/`. There are no npm dependencies: do not add any to run the tests.

## Anatomy of a test

Every test file follows the same shape:

```js
import { check } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { functionalThresholds } from '../config/thresholds.js';   // pick the right profile
import { get } from '../utils/requests.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

export const options = { vus: 1, iterations: 1, thresholds: functionalThresholds };

export default function () { /* request + checks */ }

export function handleSummary(data) { return generateReport(data, 'my-test'); }
```

Rules:
1. **Base URL** always comes from `currentEnvironment.baseUrl` (reads `__ENV.BASE_URL`, defaults to `https://dummyjson.com`). Never hardcode a host.
2. **HTTP calls** go through `utils/requests.js` (`get`, `post`, `put`, `patch`, `del`). They add JSON headers and stringify payloads. Do not call `k6/http` directly in tests.
3. **Never call `r.json()` inside a check.** A non-JSON response (a 5xx HTML page) would throw and crash the iteration. Use `jsonField(r, 'a.b')` or `safeJson(r)` from `utils/checks.js`.
4. **Every test sets `thresholds`** and exports `handleSummary` through `generateReport`. A test without thresholds cannot fail CI.
5. **Secrets and credentials** come from `__ENV` with a safe default only for public demo values (see `auth-test.js`: `AUTH_USERNAME`, `AUTH_PASSWORD`). Never commit a real token.

## Threshold profiles (`config/thresholds.js`)

| Export | Use for |
|---|---|
| `smokeThresholds` | smoke: every check must pass (`checks rate==1`), p95 < 1500 ms |
| `functionalThresholds` | single-request and workflow tests: every check passes, p95 < 2000 ms |
| `loadThresholds` | expected traffic: strict baseline plus `api_response_time`, `business_failure_rate` |
| `stressThresholds` / `spikeThresholds` | looser latency, error rate < 5 %, checks > 90 % |
| `soakThresholds` | strict baseline held over a long run |

`thresholds` is the shared baseline. Add a new profile here rather than inline in a test. Latency values are starting targets, not standards.

## Custom metrics (`utils/metrics.js`)

`apiResponseTime` (Trend), `successfulRequests`, `failedRequests` (Counter), `businessFailureRate` (Rate). Only `load-test.js` uses them today. If a test uses them, its thresholds profile must reference them (see `loadThresholds`).

## Test data

`data/test-data.json` is loaded with `SharedArray` (`productIds`, `searchQueries`). Every search term must return results on the target API: a term that returns zero results makes `Search returns products` fail. (`"beauty"` was a category, not a search term, and was replaced by `"mascara"`.)

## Known gotchas

- `utils/reporting.js` (CLI tests) imports the HTML reporter from GitHub raw and `jslib.k6.io` on every run, so those tests need internet access and abort if it times out. `tests/generic-runner.js` (web UI) uses `utils/ui-report.js` with the bundled `utils/vendor/k6-reporter-3.0.4.js` instead.
- `load-test.js` has no `sleep()` between iterations (about 10,000 requests in 2 minutes with 5 VUs). Add think time if a test should be gentle on a shared API.
- Exit code 99 means a threshold failed. Exit code 0 means all passed.

## Checklist when adding a test

1. Create `tests/<name>-test.js` following the anatomy above.
2. Add an `npm run test:<name>` script to `package.json`.
3. Add a row to the scenario table in `README.md`.
4. Run it (see the `pulsecheck-run-and-verify` skill) and confirm exit code 0 and a report in `reports/`.
5. If the UI manifest exists (`config/tests.manifest.json`), add the test there too.
