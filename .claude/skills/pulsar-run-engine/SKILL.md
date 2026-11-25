---
name: pulsar-run-engine
description: Design rules for the Pulsar backend that starts k6 from the web UI (Next.js route handlers): safe process spawning, the run config JSON, secrets handling, live progress, result storage and history. Use when building or changing anything server-side that runs k6, stores runs, or accepts a base URL, token or payload from the UI.
---

# Pulsar run engine (server side)

Status: **planned**, not built yet. The browser cannot run k6. A server on the user's machine starts `k6 run` as a child process and reports back. Because k6 runs on the same machine, `http://localhost:PORT` targets work, with no CORS concern.

## Hard rules

1. **Bind to `127.0.0.1` only** (`next dev -H 127.0.0.1`, `next start -H 127.0.0.1`).
2. **Never build a shell command string.** Use `child_process.spawn('k6', [args...])` with an argument array and `shell: false`.
3. **Run only known tests.** The request names a test or a template id from `config/tests.manifest.json`; the server maps it to a file. No user-supplied file paths or k6 flags.
4. **Validate inputs** before spawning: `baseUrl` via `new URL()` with protocol `http:` or `https:` only; numeric fields (VUs, durations, rates) clamped to sane limits; JSON bodies parsed and size-limited.
5. **One run at a time.** A second start request is rejected with 409.
6. **Secrets stay out of storage.** Tokens, API keys and passwords are passed to k6 via environment variables (`AUTH_TOKEN`, `API_KEY`, ...), never as CLI arguments (they show in `ps`), never written to `meta.json`, the config copy, logs or reports. Echo them back only masked.
7. **Warn on non-local targets** for heavy tests (load, stress, spike, soak). `localhost`, `127.0.0.1` and `dummyjson.com` need no confirmation.
8. **Node runtime only.** Route handlers that spawn k6 must set `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`.
9. **Keep run state in `globalThis`**, not a module variable, so dev hot reload does not forget a running test.

## Run lifecycle

1. `POST /api/runs` with `{ template | config }`: validate, create `reports/runs/<id>/`, write `meta.json` (no secrets).
2. Spawn `k6 run --out json=reports/runs/<id>/points.json <script>` with env `BASE_URL`, `RUN_ID`, `PC_CONFIG` (the generated config JSON) and any secrets.
3. Tail `points.json`; aggregate per second (VUs, requests/s, avg and p95 latency, errors) and push over **Server-Sent Events** at `GET /api/runs/:id/events`. Also forward k6 stdout lines.
4. On exit, read the summary JSON written by `handleSummary`. Verdict: exit `0` passed, `99` thresholds failed, other error.
5. **Stop:** send `SIGINT` (k6 stops gracefully and still writes a summary), `SIGKILL` after 5 s.

Planned API: `GET /api/health` (k6 found, version), `GET /api/tests`, `POST /api/runs`, `GET /api/runs`, `GET /api/runs/:id`, `GET /api/runs/:id/events`, `POST /api/runs/:id/stop`, `GET /api/runs/:id/report`, `DELETE /api/runs/:id`.

## Storage (no database)

```
reports/runs/<runId>/
  meta.json      id, test, baseUrl, startedAt, endedAt, status, exitCode
  summary.json   data object from handleSummary
  points.json    k6 --out json stream
  report.html    k6-reporter output
```

Delete runs by removing the folder. Add `reports/runs/` to `.gitignore` (already covered by `reports/*`).

## The run config (UI to k6)

Every UI setting becomes one JSON object consumed by a **generic k6 script** (planned, e.g. `tests/generic-runner.js`, reading `__ENV.PC_CONFIG`). Shape (see the "What Pulsar hands to k6" panel in the UI preview):

```json
{
  "baseUrl": "http://localhost:8080",
  "request": { "method": "POST", "path": "/api/orders", "headers": {}, "body": {} },
  "auth": { "type": "bearer" },
  "load": { "stages": [{ "duration": "30s", "target": 5 }], "thinkTimeSeconds": 1 },
  "thresholds": { "http_req_duration": ["p(95)<1000"] },
  "checks": [{ "type": "status", "value": "201" }]
}
```

Scenarios add `steps` (each with `extract` of values from a response and `checks`), `data` (CSV/JSON file and pick mode) and `mix` (weights between flows). Body variables: `{{$randomInt}}`, `{{$uuid}}`, `{{$timestamp}}`, `{{$randomEmail}}`, `{{vars.name}}`, `{{data.field}}`.

Required changes to existing code when this is built: `utils/reporting.js` writes into `reports/runs/${__ENV.RUN_ID}/` when `RUN_ID` is set; the existing 12 tests stay as ready-made templates.
