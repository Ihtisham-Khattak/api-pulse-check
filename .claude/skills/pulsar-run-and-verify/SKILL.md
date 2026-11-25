---
name: pulsar-run-and-verify
description: How to run Pulsar k6 tests locally, read their results, and verify a change works. Use when asked to run or start the project, run a specific test, check results, or confirm a change did not break anything.
---

# Running and verifying Pulsar

k6 is a system binary (already installed at `/usr/bin/k6` on this machine). Node and npm are only used for the `npm run` shortcuts: there is no `npm install` step.

## Run a test

```bash
cd /media/peregrine/dc9e13b9-21f1-46ce-89f8-90d9cac056f31/API-Pulse-Check
npm run test:smoke                       # or: k6 run tests/smoke-test.js
BASE_URL="http://localhost:8080" npm run test:smoke      # another target
k6 run -e AUTH_USERNAME=u -e AUTH_PASSWORD=p tests/auth-test.js
```

| Script | Approx. time |
|---|---|
| `test:smoke`, `auth`, `search`, `post`, `put`, `patch`, `delete` | about 2 s each |
| `test:workflow` | about 1 min 40 s |
| `test:load` | about 2 min |
| `test:spike` | about 1 min 25 s |
| `test:stress` | about 2 min 30 s |
| `test:soak` | about 3 min |

## Reading results

- Terminal: each check shows a tick or a cross, then metric lines. A cross next to a threshold means it failed.
- Exit code: `0` all thresholds passed, `99` a threshold failed, anything else is a script or network error.
- Reports: `reports/<test-name>.html` and `.json` (gitignored; `reports/.gitkeep` keeps the folder).

## Verifying a change

1. Syntax and options only (fast, no network): `k6 inspect tests/<name>-test.js`.
2. Run the affected tests for real. For anything under `utils/` or `config/`, run at least: smoke, auth, search, post, put, patch, delete.
3. Run `test:load` if `utils/metrics.js`, `utils/reporting.js` or `config/thresholds.js` changed (it is the only test using the custom metrics).
4. Clear generated files afterwards: `rm -f reports/*.html reports/*.json`.

Quick loop over the short tests:

```bash
for t in smoke auth search post put patch delete; do
  k6 run --quiet --no-color tests/$t-test.js > /dev/null 2>&1; echo "$t exit=$?"
done
```

## Safety rules (always)

- Only run load, stress, spike and soak against systems the user owns or has permission to test. DummyJSON (the default) and `localhost` are fine for light use.
- Never run a heavy test against a third-party API without the user explicitly agreeing.
- The CLI tests in `tests/*-test.js` need internet access: `utils/reporting.js` downloads the report and summary libraries at start-up, and a timeout there aborts the run (exit 107, "couldn't be retrieved"). Tests started from the web UI use the bundled copy in `utils/vendor/` and do not.
- Before testing a localhost address, check what really answers there (`curl -sI`): ports such as 8080 and 8000 are often used by other software (here 8080 was Jenkins).
- A failing test is information. Report it faithfully with the output. Do not weaken a threshold to make it pass unless the user asks.

## The web UI

```bash
npm run ui:install     # once
npm run ui             # starts http://localhost:3000 (bound to 127.0.0.1)
```

It runs the same k6 binary through `tests/generic-runner.js` and stores each run in `reports/runs/<id>/`. The static design preview in `ui/index.html` is kept only as a visual reference.
