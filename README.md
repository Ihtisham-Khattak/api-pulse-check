# PulseCheck ⚡
### API Performance Testing, in the browser or from the command line

![k6](https://img.shields.io/badge/k6-Performance_Testing-7D64FF?logo=k6&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-Web_UI-000000?logo=nextdotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?logo=githubactions&logoColor=white)

**PulseCheck** tests how an API behaves: does it return the right data, and how fast and stable is it under load? It is built on [Grafana k6](https://k6.io/) and has two ways to use it:

- **The PulseCheck site** (a local web app): pick a test, point it at any API, including one running on `localhost`, add your token and payload, press Run, and read the results.
- **The command line**: ready-made k6 scripts you can run with `npm run test:*` and in CI.

## Contents

1. [How it works (the basic flow)](#how-it-works-the-basic-flow)
2. [Requirements](#requirements)
3. [Run the main site](#run-the-main-site)
4. [Use the site: test an API endpoint](#use-the-site-test-an-api-endpoint)
5. [Add an API endpoint](#add-an-api-endpoint)
6. [Try it end to end with the sample API](#try-it-end-to-end-with-the-sample-api)
7. [Run from the command line](#run-from-the-command-line)
8. [Project structure](#project-structure)
9. [Metrics, thresholds and reports](#metrics-thresholds-and-reports)
10. [CI/CD](#cicd)
11. [Troubleshooting](#troubleshooting)
12. [Safety](#safety)
13. [Author](#author)

---

## How it works (the basic flow)

```text
  You (browser)
      │  1. choose a template or build a test: address, auth, requests, test type
      ▼
  PulseCheck site  (Next.js, http://localhost:3000)
      │  2. validates the input and saves config.json (never the secrets)
      │  3. starts k6 with  tests/generic-runner.js
      ▼
  k6  ───────────────►  Your API  (http://localhost:4010, or any address)
      │  4. sends the requests, runs your checks, applies the pass/fail rules
      │
      ├─► live progress (users, requests/sec, p95, errors) streamed to the page
      ▼
  reports/runs/<id>/        5. everything is saved on this computer
      ├── config.json       the test that was run (no tokens or passwords)
      ├── meta.json         name, status, timings
      ├── summary.json      k6 results
      ├── series.json       data for the charts
      └── report.html       full k6 HTML report
      │
      ▼
  Result page + History     6. verdict, KPIs, charts, rules, checks, compare runs
```

In short: **the browser only collects settings and shows results. k6 does the real testing on your machine.** That is why `localhost` addresses work: k6 and your site are on the same computer.

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js + npm | 20.9 or newer | Runs the site. Check with `node -v`. |
| k6 | any recent version | Does the testing. Check with `k6 version`. Install: https://grafana.com/docs/k6/latest/set-up/install-k6/ |
| A browser | any modern one | Chrome, Edge, Firefox, Safari. |

On Windows with Winget: `winget install k6 --source winget`. On macOS with Homebrew: `brew install k6`.

Get the code:

```bash
git clone https://github.com/rony-codes/Pulse-Check.git
cd Pulse-Check
```

## Run the main site

All commands are run from the project root (the folder that contains this README).

### Development mode (the usual way)

```bash
npm run ui:install     # once: installs the site's dependencies
npm run ui             # starts the site
```

Open **http://localhost:3000**. The sidebar shows `k6 <version> ready` when k6 was found.

### Production mode (faster, no hot reload)

```bash
npm run ui:build       # once, and again after you change the code
npm run ui:start
```

### Use another port

Port 3000 is a common port for other dev servers. If it is taken, or if you want to keep your own site on it:

```bash
PORT=4100 npm run ui                 # Linux and macOS
$env:PORT=4100; npm run ui           # Windows PowerShell
```

Then open `http://localhost:4100`.

### Stop the site

Press `Ctrl + C` in the terminal that is running it. A test that is running can be stopped from the page with **Stop test**.

The site only listens on `127.0.0.1`, so other computers on your network cannot open it.

## Use the site: test an API endpoint

1. Open the site and click **New test** (or start from a template on the home page).
2. **Step 1, Target.** Enter the **Base URL** of your API, for example `http://localhost:4010`. Press **Test connection** to confirm something answers there and that it is the application you expect. Choose how your API authenticates:

   | Option | Use it when |
   |---|---|
   | None | The endpoint is open. |
   | Bearer token | You have a token to paste. Sent as `Authorization: Bearer <token>`. |
   | API key | Your API reads a key from a header such as `X-API-Key`. |
   | Basic | Username and password. |
   | Log in first | Tokens expire. PulseCheck calls your login endpoint once and uses the token from the response. |

3. **Step 2, Requests.** Add one request, or several that run in order:
   - **Method and path**, for example `POST` and `/api/orders`.
   - **Payload (JSON body)** for POST, PUT and PATCH. It is checked as you type.
   - **Checks**: what must be true for the response to count as correct. This is how you verify the data your API returns.

     | Check | Example |
     |---|---|
     | Status code equals | `201` |
     | JSON field equals | `$.qty` equals `2` |
     | JSON field exists | `$.id` |
     | Body contains text | `created` |
     | Responds under (ms) | `500` |

   - **Save values from the response** to reuse in later requests, for example save `$.id` as `orderId`, then call `/api/orders/{{vars.orderId}}`.
   - **Test data** (optional): paste CSV or JSON to send different values on every iteration.

   Values you can use in paths, payloads, headers and checks:

   | Value | Meaning |
   |---|---|
   | `{{$randomInt}}` | A random number |
   | `{{$uuid}}` | A random unique id |
   | `{{$timestamp}}` | The current time in milliseconds |
   | `{{$randomEmail}}` | A random email address |
   | `{{vars.name}}` | A value saved from an earlier response |
   | `{{data.column}}` | A column from your test data |

   JSON paths use the form `$.field`, `$.user.id` or `$.items[0].name`.

4. **Step 3, Test type.** Choose how hard to push. Everything can be edited afterwards.

   | Type | What it does |
   |---|---|
   | Smoke | One user, a few iterations. Every check must pass. |
   | Load | Expected traffic: 5 users for about 2 minutes. |
   | Stress | Steps up to 15 users to find the breaking point. |
   | Spike | A sudden jump from 2 to 15 users, then back. |
   | Soak | 3 users for 3 minutes to catch slow degradation. |

   You can also set the load shape yourself (fixed users, ramp in stages, or a fixed rate) and the **pass or fail rules**, for example "p95 response time below 1000 ms".

5. Press **Run test**. The live page shows users, requests per second, p95 latency and errors, with a **Stop test** button.
6. Read the **result**: a PASSED or FAILED verdict, KPIs, charts, the rules, and every check. If requests failed, the **What went wrong** card shows the first failing requests (for example `HTTP 401` or `connection refused`). **HTML report** and **JSON** open the full k6 output.
7. **History** keeps every run. Tick two runs and press compare to see what changed. **Run again** reopens a past run's settings (tokens and passwords are never saved, so enter them again).

## Add an API endpoint

There are three ways, from quickest to most permanent.

### A. In the site (no code)

Use **New test** and add your endpoint as a request (steps above). This is the normal way to test any endpoint on any API.

### B. Save it as a reusable template (a little code)

Templates are the cards on the home page. Add one to `web/lib/templates.ts`:

```ts
{
  id: 'create-order',                      // unique, used in the URL ?template=create-order
  name: 'Create an order',
  category: 'quick',                       // 'quick' | 'workflow' | 'performance'
  icon: 'post',                            // get | auth | search | post | put | patch | delete | workflow | load | stress | spike | soak | smoke
  testType: 'smoke',                       // 'smoke' | 'load' | 'stress' | 'spike' | 'soak' | 'custom'
  description: 'Create an order and verify the response body.',
  summary: 'POST /api/orders',
  build: () => form('Create an order', 'smoke', [
    step({
      name: 'Create order',
      method: 'POST',
      path: '/api/orders',
      body: '{\n  "item": "book {{$randomInt}}",\n  "qty": 2\n}',
      checks: [status('201'), jsonEq('$.qty', '2'), exists('$.id')]
    })
  ], { baseUrl: 'http://localhost:4010' })   // optional: pre-fill the address
}
```

Save the file. The new card appears on the home page. (`status`, `jsonEq`, `exists`, `form` and `step` are helpers already defined at the top of that file.) Never put a real token in a template.

### C. As a command-line k6 test (for CI)

Create `tests/orders-test.js`:

```javascript
import { check } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { functionalThresholds } from '../config/thresholds.js';
import { post } from '../utils/requests.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

export const options = { vus: 1, iterations: 1, thresholds: functionalThresholds };

export default function () {
    const token = __ENV.AUTH_TOKEN || '';
    const res = post(
        `${currentEnvironment.baseUrl}/api/orders`,
        { item: 'book', qty: 2 },
        { headers: { Authorization: `Bearer ${token}` } }
    );

    check(res, {
        'Status is 201': (r) => r.status === 201,
        'Quantity is 2': (r) => jsonField(r, 'qty') === 2
    });
}

export function handleSummary(data) {
    return generateReport(data, 'orders-test');
}
```

Add a script to `package.json`:

```json
"test:orders": "k6 run tests/orders-test.js"
```

Run it:

```bash
BASE_URL=http://localhost:4010 AUTH_TOKEN=demo-token npm run test:orders
```

Rules for command-line tests: read the address from `currentEnvironment.baseUrl`, send requests through `utils/requests.js`, read response fields with `jsonField` (never `r.json()` inside a check), always set `thresholds`, and read secrets from environment variables.

## Try it end to end with the sample API

The repo includes a tiny API so you can see the whole flow without any setup of your own.

1. Start the sample API in one terminal (port 4010):

   ```bash
   node examples/sample-api.mjs
   ```

   It offers `POST /api/login` (`demo` / `secret`), `POST /api/orders` and `GET /api/orders/:id`. The orders endpoints need `Authorization: Bearer demo-token`. If port 4010 is busy: `PORT=5001 node examples/sample-api.mjs`.

2. Start the site in a second terminal: `npm run ui`, and open http://localhost:3000.
3. Click **New test**. In **Target**, enter `http://localhost:4010` and press **Test connection**. Choose **Bearer token** and paste `demo-token`, or choose **Log in first** with login path `/api/login`, username `demo`, password `secret`, and token location `$.token`.
4. In **Requests**, set the method to `POST`, the path to `/api/orders`, the payload to `{"item": "book {{$randomInt}}", "qty": 2}`, and add the checks `Status code equals 201` and `JSON field equals $.qty = 2`.
5. In **Test type**, pick **Smoke** and press **Run test**.
6. Change the token to something wrong and run again to see the **What went wrong** card explain the `HTTP 401`.

## Run from the command line

The k6 scripts in `tests/` work without the site. They target the public [DummyJSON](https://dummyjson.com) demo API by default.

```bash
npm run test:smoke
BASE_URL="https://your-api.example.com" npm run test:smoke      # another API
k6 run -e AUTH_USERNAME=myuser -e AUTH_PASSWORD=mypass tests/auth-test.js
```

| Scenario | Command | Purpose | Approx. time |
|---|---|---|---|
| Smoke | `npm run test:smoke` | Verify basic API functionality | 2 s |
| Authentication | `npm run test:auth` | Validate authenticated endpoints | 2 s |
| Search | `npm run test:search` | Validate API search functionality | 2 s |
| POST, PUT, PATCH, DELETE | `npm run test:post`, `:put`, `:patch`, `:delete` | One request each | 2 s each |
| API Workflow | `npm run test:workflow` | Validate multiple API operations | 1 min 40 s |
| Load | `npm run test:load` | Performance under expected load | 2 min |
| Spike | `npm run test:spike` | Sudden traffic increases | 1 min 25 s |
| Stress | `npm run test:stress` | Gradually increase workload | 2 min 30 s |
| Soak | `npm run test:soak` | Sustained workload | 3 min |

Terminal output shows each check with a tick or a cross. The exit code is `0` when every rule passed and `99` when a rule failed. Reports are written to `reports/<test-name>.html` and `.json`.

These scripts use DummyJSON-style endpoints (`/products`, `/auth/login`). To test your own API, use the site or add a test as in [option C](#c-as-a-command-line-k6-test-for-ci).

**Note:** the command-line scripts download their report library when they start, so they need internet access and abort if that download times out. Tests started from the site use a bundled copy (`utils/vendor/`) and do not.

You can also run a saved site configuration by hand:

```bash
RUN_ID=manual PC_CONFIG_FILE=/absolute/path/to/config.json k6 run tests/generic-runner.js
```

### Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | the site | Port to listen on (default 3000) |
| `BASE_URL` | command-line tests | API address (default `https://dummyjson.com`) |
| `AUTH_USERNAME`, `AUTH_PASSWORD` | `test:auth` | Login for the auth test (defaults are DummyJSON's public demo user) |
| `PULSECHECK_ROOT` | the site | Project folder, only if you start the site from somewhere else |

## Project structure

```text
Pulse-Check/
├── web/                     The PulseCheck site (Next.js, React, TypeScript)
│   ├── app/                 Pages and the API routes (app/api/...)
│   ├── components/          Screens and UI parts (wizard/, charts/)
│   ├── lib/                 Shared logic: templates, presets, validation
│   │   └── server/          Server only: starts k6, stores runs
│   └── public/fonts/        Space Grotesk, Inter, JetBrains Mono
├── tests/                   k6 test scripts
│   ├── generic-runner.js    The runner the site uses (reads a JSON config)
│   └── *-test.js            Ready-made command-line tests
├── utils/                   Shared k6 helpers: requests, checks, metrics, reporting
│   └── vendor/              Bundled k6-reporter (MIT)
├── config/                  environments.js, thresholds.js
├── data/                    test-data.json for the command-line tests
├── examples/sample-api.mjs  A small API to practise on
├── reports/                 Results (git-ignored). Site runs are in reports/runs/<id>/
├── ui/                      Static design preview of the site (visual reference only)
├── .github/workflows/       performance.yml (CI)
└── package.json             Scripts: test:*, ui, ui:install, ui:build, ui:start
```

How the site talks to the server (all under `web/app/api/`):

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Is the server up, is k6 installed, which version |
| `POST /api/check` | "Test connection" for an address |
| `POST /api/runs` | Validate and start a test |
| `GET /api/runs` | List history |
| `GET /api/runs/:id` | One run's result |
| `GET /api/runs/:id/events` | Live progress (Server-Sent Events) |
| `POST /api/runs/:id/stop` | Stop a running test |
| `GET /api/runs/:id/report` | HTML report, or `?type=json` to download |
| `DELETE /api/runs/:id` | Delete a run |

## Metrics, thresholds and reports

### Custom metrics (command-line load test)

| Metric | Description |
|---|---|
| `api_response_time` | Tracks API response duration |
| `successful_requests` | Counts successful HTTP responses |
| `failed_requests` | Counts unsuccessful HTTP responses |
| `business_failure_rate` | Tracks failed business checks |

### Thresholds (pass or fail rules)

Defined in `config/thresholds.js`, with one profile per scenario: `smokeThresholds`, `functionalThresholds`, `loadThresholds`, `stressThresholds`, `spikeThresholds` and `soakThresholds`. Stress and spike are looser than load and soak. Smoke and functional tests require every check to pass. The same values are the defaults in the site (`web/lib/presets.ts`).

The baseline used by load and soak:

- Average response time below 500 ms.
- 90th percentile below 800 ms.
- 95th percentile below 1000 ms.
- 99th percentile below 1500 ms.
- HTTP request failure rate below 1%.
- Check success rate above 95%.

These are starting targets, not universal performance standards.

### Reports

Every run produces an HTML report (statistics, response-time distribution, request metrics, check results) and a JSON summary. From the site, open them from the result page. They are stored in `reports/runs/<id>/`. Command-line tests write `reports/<test-name>.html` and `.json`. Reports are excluded from Git.

## CI/CD

Workflow: `.github/workflows/performance.yml`.

1. Checks out the repository.
2. Sets up k6 on the GitHub runner.
3. Runs the API smoke test.
4. Verifies the generated reports.
5. Uploads the reports as GitHub Actions artifacts (kept for seven days).

It runs on push, on pull requests, and manually. [View GitHub Actions](https://github.com/rony-codes/Pulse-Check/actions)

## Troubleshooting

| Problem | What to do |
|---|---|
| Sidebar says **k6 not found** | Install k6 (see [Requirements](#requirements)), then reload the page. |
| `npm run ui` says the port is in use | Use another port: `PORT=4100 npm run ui`. |
| A test fails and every request failed | Open the result: **What went wrong** shows the first errors. `HTTP 401/403` means the token or login is wrong. `connection refused` means nothing is listening at that address. |
| You are not sure the address is right | Press **Test connection** in step 1. It reports what answers and which software it identifies as. Ports such as 8080 and 8000 are often used by other programs (for example Jenkins on 8080). |
| **A test is already running** | Only one test runs at a time. Open the running test from the sidebar and stop it, or wait. |
| A run says "The server stopped while this test was running" | The site was restarted during a test. Run it again. |
| Command-line test aborts with `couldn't be retrieved` | The report library could not be downloaded (no internet). Tests started from the site do not have this problem. |
| `PORT=4100 npm run ui` does not work on Windows | In PowerShell use `$env:PORT=4100; npm run ui`. |
| Page looks unstyled or stale after an update | Stop the site, delete `web/.next`, and start it again. |

## Safety

- Only run load, stress, spike and soak tests against systems you own or have explicit permission to test. The site asks you to confirm heavy tests against any host that is not `localhost`, `127.0.0.1` or `dummyjson.com`.
- Tokens, API keys and passwords stay in memory and are passed to k6 privately. They are never written to history, reports, logs or `config.json`.
- The site only listens on your own computer, only runs the built-in runner, and checks every input (address, limits on users, duration and size) before starting k6.
- Performance profiles are configurable examples, not certified capacity benchmarks.

## Current status

| Component | Status |
|---|---|
| Command-line tests, metrics, thresholds, reports | Complete |
| GitHub Actions CI (smoke test) | Working |
| Web site: templates, three-step builder, live run, results, history, compare | Working |
| Traffic mix for scenarios (several flows with weights) | Planned |
| Configurable CI environments | Planned |
| Performance regression detection across runs | Planned |

## Author

**Rohan Kumar**

Software Engineer | API Testing | Performance Engineering

GitHub: [@rony-codes](https://github.com/rony-codes)

---

*PulseCheck — Measure. Analyze. Improve.*
