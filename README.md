<p align="center">
  <img src="docs/images/banner.svg" alt="PulseCheck: API testing for QA engineers, in your browser" width="100%">
</p>

<p align="center">
  <img alt="k6" src="https://img.shields.io/badge/k6-Performance_Testing-7D64FF?logo=k6&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-Web_UI-000000?logo=nextdotjs&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black">
  <img alt="GitHub Actions" src="https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?logo=githubactions&logoColor=white">
  <img alt="Contributions welcome" src="https://img.shields.io/badge/Contributions-welcome-0B5D3B">
</p>

<h3 align="center">Test any API without writing a script.<br>See if it returns the right data, and how it behaves under load.</h3>

<p align="center">
  <a href="#run-the-main-site"><b>Quick start</b></a> &nbsp;·&nbsp;
  <a href="#see-it-in-action"><b>See it in action</b></a> &nbsp;·&nbsp;
  <a href="#join-us-contribute"><b>Contribute</b></a> &nbsp;·&nbsp;
  <a href="#roadmap-what-we-want-to-build-next"><b>Roadmap</b></a>
</p>

<p align="center">
  <img src="docs/videos/demo.gif" alt="A 50 second tour: build a test for a local API, run it, and read the result" width="900">
  <br>
  <sub>▶ Full-quality video: <a href="docs/videos/demo.mp4">demo.mp4</a></sub>
</p>

**PulseCheck** lets you test an API without writing a test script. Point it at any address, including a site running on `localhost`. Add your token and your payload, choose how hard to push, press **Run**, and get a clear verdict: *does it return the right data, and how fast and stable is it under load?*

It is a friendly web interface on top of [Grafana k6](https://k6.io/), the open-source load-testing engine. You get the power of k6 without having to learn its scripting first, and you can still use plain k6 scripts from the command line and in CI.

> **Everyone is welcome to help.** If you are a software quality assurance engineer, a developer, or just someone who cares about reliable software, see [Join us](#join-us-contribute) at the bottom. This project gets better with every tester who uses it and shares what they learned.

## Contents

1. [Why this project exists](#why-this-project-exists)
2. [Who it is for](#who-it-is-for)
3. [Features](#features)
4. [See it in action](#see-it-in-action)
5. [How it works (the basic flow)](#how-it-works-the-basic-flow)
6. [Requirements](#requirements)
7. [Run the main site](#run-the-main-site)
8. [Use the site: test an API endpoint](#use-the-site-test-an-api-endpoint)
9. [Add an API endpoint](#add-an-api-endpoint)
10. [Try it end to end with the sample API](#try-it-end-to-end-with-the-sample-api)
11. [Run from the command line](#run-from-the-command-line)
12. [Project structure](#project-structure)
13. [Metrics, thresholds and reports](#metrics-thresholds-and-reports)
14. [CI/CD](#cicd)
15. [Troubleshooting](#troubleshooting)
16. [Safety](#safety)
17. [Roadmap: what we want to build next](#roadmap-what-we-want-to-build-next)
18. [Join us (contribute)](#join-us-contribute)
19. [Status, license and author](#status-license-and-author)

---

## Why this project exists

Testing an API properly means answering two different questions:

1. **Is it correct?** Does `POST /orders` really return `201`, and is the `qty` in the response the one I sent?
2. **Is it fast and stable?** What happens with 5, 50 or 500 users at once? Where does it start to slow down or fail?

Good tools exist for both, but the usual path is slow and uneven:

- Performance tools like k6 are excellent, but they need scripting knowledge. Many QA engineers who know exactly *what* to test lose time on *how* to write it.
- Request tools are friendly, but they are not built for load, thresholds or repeatable reports.
- Results end up in terminal output or scattered files that are hard to compare or share with a team.

**The aim of PulseCheck** is to remove that friction:

- **Fewer steps from idea to result.** Pick a template or fill in three steps, then run.
- **One place for correctness and performance.** The same test checks the data your API returns *and* how it behaves under load.
- **Results anyone can read.** A plain verdict (PASSED or FAILED), the reason, charts, and a history you can compare.
- **Repeatable and shareable.** Every run is saved with its exact settings, and the same k6 scripts run in CI.
- **Safe by default.** Secrets never reach disk, heavy tests ask for confirmation, and everything runs on your own computer.

We believe quality engineering is moving toward tools that make good testing the easy path. PulseCheck is our contribution to that, built in the open, so that QA engineers can shape it together.

<p align="center">
  <img src="docs/images/why.svg" alt="The usual way versus PulseCheck: scripting first, two separate tools and buried results, against three steps, one test and a clear verdict" width="100%">
</p>

## Who it is for

- **QA and test automation engineers** who want fast API and performance checks without scripting overhead.
- **Developers** who want to see how their endpoint behaves before it reaches production.
- **Teams** that want repeatable tests in CI and results everyone can understand.
- **Learners** who want to understand performance testing hands-on, with real numbers and clear explanations.

## Features

<p align="center">
  <img src="docs/images/features.svg" alt="Eight features: localhost, real payloads, checks, live results, history, kept drafts, private secrets and CI scripts" width="100%">
</p>

<p align="center">
  <img src="docs/images/three-steps.svg" alt="Three steps: Target, Requests, Test type, then the result" width="100%">
</p>

**In the web site**

- **Ready-made templates** for common checks (smoke, auth, search, POST/PUT/PATCH/DELETE, CRUD workflow) and for load, stress, spike and soak tests.
- **A three-step builder:** *Target* (address and authentication), *Requests* (what to call, with payloads and checks), *Test type* (how hard to push and what counts as a pass).
- **Works with localhost.** PulseCheck runs on your computer, so it can test a site you are developing right now. **Test connection** shows what really answers at an address, so you don't test the wrong application by mistake.
- **Authentication:** none, bearer token, API key, basic, or "log in first" (PulseCheck logs in and reuses the token).
- **Real payloads and data:** JSON bodies with built-in dynamic values (`{{$randomInt}}`, `{{$uuid}}`, ...), CSV or JSON test data, and values saved from one response and used in the next request.
- **Checks that verify your data:** status codes, JSON fields, text in the body and response time.
- **Pass or fail rules** (thresholds) you can edit, such as "p95 below 1000 ms and under 1% errors".
- **Live runs:** users, requests per second, p95 latency and errors update as the test runs, with a **Stop** button.
- **Clear results:** a verdict, KPIs, charts, the rules and every check. If requests failed, a **What went wrong** card shows the first errors (for example `HTTP 401` or `connection refused`).
- **History and comparison:** every run is kept. Compare two runs side by side to see what changed. **Run again** reopens a past run's settings.
- **Your work is not lost.** Move between the three steps, use the browser's Back button, or refresh the page: your entries stay. (After a refresh, only the step you are on starts fresh. Tokens and passwords are never stored, by design.)
- **Light and dark themes**, keyboard friendly, and usable on a phone-sized screen.

**On the command line and in CI**

- **Reusable k6 scripts** for smoke, load, stress, spike and soak tests, plus authentication, search and full CRUD workflows.
- **Per-scenario thresholds**, custom metrics and HTML and JSON reports.
- **GitHub Actions** workflow that runs the smoke test and uploads the reports.

## See it in action

Everything below is real: these screenshots and videos were recorded from PulseCheck testing the [sample API](#try-it-end-to-end-with-the-sample-api) included in this repo.

### Start from a template, or build your own

<p align="center">
  <img src="docs/images/screenshots/templates.png" alt="The home page: twelve ready-made templates in three groups" width="100%">
</p>

### Build a test in three steps

<details>
<summary><b>Show the three builder screens</b> (Target, Requests, Test type)</summary>
<br>

**1. Target.** Type the address, check it with **Test connection**, and choose how your API authenticates.

<img src="docs/images/screenshots/builder-target.png" alt="Step 1: the address field with a green Test connection result" width="100%">

**2. Requests.** Method, path, payload and checks. Save values from one response to use in the next request.

<img src="docs/images/screenshots/builder-requests.png" alt="Step 2: a POST request with a JSON payload and three checks" width="100%">

**3. Test type.** Pick smoke, load, stress, spike or soak, and edit the load and the pass or fail rules.

<img src="docs/images/screenshots/builder-type.png" alt="Step 3: test type cards, the planned load chart and the pass or fail rules" width="100%">

</details>

<p align="center">
  <img src="docs/images/test-types.svg" alt="Smoke, load, stress, spike and soak tests, the load shape of each and the question each one answers" width="100%">
</p>

### Watch it run

<p align="center">
  <img src="docs/images/screenshots/live-run.png" alt="A test in progress: users, requests per second, p95 latency and live charts" width="100%">
</p>

### Read the result

<p align="center">
  <img src="docs/images/screenshots/result-passed.png" alt="A passed result with KPIs, charts, rules and checks" width="100%">
</p>

### When something fails, PulseCheck tells you why

A wrong or expired token, a path that does not exist, a rule that was missed: every failure comes with the reason, not just a red badge.

<p align="center">
  <img src="docs/videos/wrong-token.gif" alt="A run fails because of an expired token and the result explains the HTTP 401" width="900">
  <br><sub>▶ <a href="docs/videos/wrong-token.mp4">wrong-token.mp4</a></sub>
</p>

<p align="center">
  <img src="docs/images/screenshots/result-failed-401.png" alt="A failed result with a What went wrong card showing HTTP 401 for each request" width="100%">
</p>

A run can also fail because the API is simply too slow. The dashed red line is the rule (p95 under 100 ms); the orange line crossed it.

<p align="center">
  <img src="docs/images/screenshots/result-failed-rule.png" alt="A failed result where the p95 line crosses the red threshold line" width="100%">
</p>

### Compare runs

<p align="center">
  <img src="docs/images/screenshots/history-compare.png" alt="History with two runs selected and a side by side comparison" width="100%">
</p>

### Dark theme and small screens

<p align="center">
  <img src="docs/images/screenshots/result-dark.png" alt="The result page in the dark theme" width="100%">
</p>

<p align="center">
  <img src="docs/images/screenshots/mobile.png" alt="The home page and a result on a phone-sized screen" width="520">
</p>

## How it works (the basic flow)

<p align="center">
  <img src="docs/images/how-it-works.svg" alt="How PulseCheck works: your browser, the PulseCheck site, k6 and your API, with results saved on your computer" width="100%">
</p>

<details>
<summary>The same flow as text</summary>

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

</details>

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

In development mode the page reloads itself whenever a source file changes. If you are only *using* the site, production mode below is calmer.

### Production mode (faster, no automatic reloads)

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
6. Read the **result**: a PASSED or FAILED verdict, KPIs, charts, the rules, and every check. If requests failed, the **What went wrong** card shows the first failing requests. **HTML report** and **JSON** open the full k6 output.
7. **History** keeps every run. Tick two runs and press compare to see what changed. **Run again** reopens a past run's settings (tokens and passwords are never saved, so enter them again).

**Your entries are kept.** Use **Back** and **Next**, or your browser's Back button, to move between the steps without losing anything. If you refresh the page, you stay on the same step; that step starts fresh while the other two keep their data. The draft lives in your browser tab only (it is gone when you close the tab), and **Start over** clears it.

<p align="center">
  <img src="docs/videos/keeps-your-work.gif" alt="Moving back and forth between steps, then refreshing: only the current step starts fresh" width="900">
  <br><sub>▶ <a href="docs/videos/keeps-your-work.mp4">keeps-your-work.mp4</a></sub>
</p>

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
│   ├── lib/                 Shared logic: templates, presets, validation, draft saving
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
├── docs/                    README images, infographics and demo videos
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

These are starting targets, not universal performance standards. Tune them to your own service.

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
| The page reloads by itself while you work | You are in development mode, which reloads when source files change. Use production mode (`npm run ui:build`, then `npm run ui:start`). Your entries are kept either way. |
| Your token or password is empty after a refresh | By design: secrets are never stored. Enter them again in step 1. |
| **A test is already running** | Only one test runs at a time. Open the running test from the sidebar and stop it, or wait. |
| A run says "The server stopped while this test was running" | The site was restarted during a test. Run it again. |
| Command-line test aborts with `couldn't be retrieved` | The report library could not be downloaded (no internet). Tests started from the site do not have this problem. |
| `PORT=4100 npm run ui` does not work on Windows | In PowerShell use `$env:PORT=4100; npm run ui`. |
| Page looks unstyled or stale after an update | Stop the site, delete `web/.next`, and start it again. |

## Safety

- Only run load, stress, spike and soak tests against systems you own or have explicit permission to test. The site asks you to confirm heavy tests against any host that is not `localhost`, `127.0.0.1` or `dummyjson.com`.
- Tokens, API keys and passwords stay in memory and are passed to k6 privately. They are never written to history, reports, logs, `config.json` or the saved draft.
- The site only listens on your own computer, only runs the built-in runner, and checks every input (address, limits on users, duration and size) before starting k6.
- Performance profiles are configurable examples, not certified capacity benchmarks.

## Roadmap: what we want to build next

<p align="center">
  <img src="docs/images/roadmap.svg" alt="Roadmap: working today, next up and later" width="100%">
</p>

These are ideas, not promises. They are good places to help. Open an issue to discuss before starting on a large one.

**Test design**
- **Traffic mix:** run several flows at once with weights (for example 70% browsing, 30% checkout).
- **Import your existing work:** create requests from a cURL command, a Postman collection or an OpenAPI file.
- **Richer checks:** JSON schema validation, header checks, regular expressions, and comparing a response with a saved baseline.
- **More authentication flows:** OAuth 2.0, refresh tokens, and signed requests.
- **Environments:** named environments (dev, staging) with their own address and settings.

**Results and teamwork**
- **Performance regression detection:** compare each run with a baseline and flag slowdowns automatically.
- **Export and share:** save a test as a file, share it with the team, and publish a read-only report page.
- **Notifications:** send a summary to Slack or email when a run fails.

**Automation**
- **Run saved site tests in CI** so the same test you built in the browser guards every pull request.
- **Scheduled runs** and trend charts over time.
- **Configurable CI environments** in GitHub Actions.

**Quality of the project itself**
- Automated tests for the site (components and API routes), and end-to-end browser tests.
- Accessibility review and translations.
- A short video and screenshots for this README.

## Join us (contribute)

<p align="center">
  <img src="docs/images/contribute.svg" alt="Built for QA engineers, with QA engineers: use it and report back, add a template, write code, improve the docs" width="100%">
</p>

**PulseCheck is built for quality assurance engineers, and it is better when QA engineers help build it.** You do not need to be a k6 or Next.js expert. Real testing experience is the most valuable thing you can bring: you know which checks matter, which errors are confusing, and which steps waste time.

You can help in many ways:

| Way to help | Examples |
|---|---|
| **Use it and tell us** | Test a real API. Report what was confusing, slow or missing. A clear bug report is a great contribution. |
| **Share ideas** | Suggest a check, a template or a result view that would make your daily work easier. |
| **Add templates** | Turn a testing pattern you use often (login flow, pagination, file upload, idempotent POST) into a template. See [Add an API endpoint](#b-save-it-as-a-reusable-template-a-little-code). |
| **Write code** | Pick something from the [roadmap](#roadmap-what-we-want-to-build-next), or fix a bug. |
| **Improve the docs** | Fix unclear steps, add examples, translate this README. |
| **Test the tester** | Try unusual inputs, big payloads and slow APIs, and see whether the tool behaves. |
| **Design and accessibility** | Improve layouts, wording, keyboard use and screen-reader support. |

### How to contribute

1. **Look first.** Search the existing issues so you do not duplicate someone's idea or report.
2. **Open an issue** for anything bigger than a small fix: describe what you want and why. For a bug, include the steps, what you expected, what happened, your Node and k6 versions, and the **What went wrong** text if there is one. Never paste real tokens or passwords.
3. **Fork** the repository and create a branch with a clear name, such as `feature/traffic-mix` or `fix/csv-quotes`.
4. **Set up** as in [Run the main site](#run-the-main-site) and make your change.
5. **Check your work** (see below).
6. **Open a pull request.** Explain what changed and why, and add a screenshot for any visible change. Small, focused pull requests are reviewed fastest.

### Ground rules for changes

- **Never commit secrets.** No real tokens, keys, passwords or private addresses, in code, templates, tests or screenshots.
- **Keep secrets out of storage.** Tokens and passwords must stay in memory only. They must not reach history, reports, logs, `config.json` or the saved draft.
- **Be safe by default.** Anything that sends heavy traffic must keep the confirmation for non-local hosts, and every input must stay validated on the server.
- **Keep it simple.** Prefer small, readable changes. Add a dependency only when it clearly earns its place.
- **TypeScript in the site:** no `any`, small components, and shared logic in `web/lib/`. Server-only code stays in `web/lib/server/`.
- **k6 scripts:** follow the rules in [option C](#c-as-a-command-line-k6-test-for-ci) (use `jsonField`, set thresholds, read secrets from the environment).
- **Accessibility counts:** keyboard use, visible focus, labels on inputs, and status shown with text and an icon, never colour alone.
- **Be kind.** Be respectful and constructive in issues and reviews. We are all here to make software more reliable.

### Check your work before a pull request

```bash
cd web && npx tsc --noEmit        # the type check must pass
npm run ui:build                  # from the project root: the production build must pass
```

Then open the site and try your change in a real browser: every screen it touches, light and dark theme, and a narrow window. If your change affects running tests, start a real run against the [sample API](#try-it-end-to-end-with-the-sample-api) and confirm the result page. For k6 script changes, run the affected `npm run test:*` commands and confirm exit code `0`.

### Good first contributions

- Add a template for a pattern you test often.
- Improve an error message that confused you.
- Add a missing example or fix a typo in this README.
- Try the site on your own API and report what you found.

**Thank you for helping make quality assurance faster and easier for everyone.**

## Status, license and author

| Component | Status |
|---|---|
| Command-line tests, metrics, thresholds, reports | Complete |
| GitHub Actions CI (smoke test) | Working |
| Web site: templates, three-step builder, live run, results, history, compare | Working |
| Drafts kept across steps and page refreshes | Working |
| Traffic mix, importers, regression detection, scheduled runs | Planned |

**License:** a license has not been chosen yet. Until one is added to the repository, please open an issue to discuss reuse or large contributions.

**Original author:** Rohan Kumar, Software Engineer | API Testing | Performance Engineering. GitHub: [@rony-codes](https://github.com/rony-codes)

---

*PulseCheck: Measure. Analyze. Improve.*
