---
name: pulsar-ui-nextjs
description: Screens, flow, design tokens and component rules for the Pulsar web UI (Next.js App Router). Use when creating or changing any UI page or component, or when porting the static preview in ui/ to Next.js.
---

# Pulsar web UI (Next.js)

Status: the static, simulated preview in `ui/` (`index.html`, `styles.css`, `app.js`) is the visual spec. The real app is a Next.js (App Router) rewrite of the same screens, wired to the run engine (see the `pulsar-run-engine` skill). Keep dependencies minimal: React, Next.js, TypeScript. No component library unless the user asks. Charts are small hand-written SVG (see `lineChart` in `ui/app.js`) or one light library.

## Primary flow: "New test" in three steps

The preview split "ready-made tests" and "Custom test", which confused people. The target design:

1. **Target:** base URL (`http://localhost:8080` is valid) plus auth: None, Bearer token, API key, Basic, or "Login first" (call a login endpoint, take the token from a JSON path).
2. **Request(s):** method, path, headers, JSON payload with variables, checks (status, JSON field equals, body contains, response time). Multi-step journeys use the **Scenario builder** (steps, saved variables, data file, traffic mix).
3. **Test type:** Smoke, Load, Stress, Spike or Soak. Each fills in users, duration and thresholds; all are editable. Also: fixed users, ramp stages, or fixed request rate.

The 12 built-in DummyJSON tests are **templates**: clicking one pre-fills the three steps.

## Screens

| Route | Content |
|---|---|
| `/` | Templates grouped Quick / Workflow / Performance, plus "New test" |
| `/new` | The three-step flow with a sticky run summary and a "What Pulsar hands to k6" JSON panel |
| `/scenario` | Scenario builder |
| `/runs/[id]` | Live view (progress, VUs, req/s, p95, errors, chart, k6 output, Stop), then the result |
| `/history` | Past runs; tick two to compare (show change as text and arrow, not colour alone) |

Result page: verdict banner (PASSED / FAILED / STOPPED with the reason), KPI cards (requests, error rate, avg, p90, p95, p99), latency chart with the p95 limit as a dashed line, thresholds table, checks table with pass rate.

## Design rules (the brand design system: green, white and black)

Character: exact, calm, instrument-like. Quiet chrome; the verdict and the charts are what stand out.

- **Palette:** neutrals plus one accent. `forest #0B5D3B` is the primary in light, `mint #3DDC84` in dark and in the sidebar. Red and amber carry meaning only. All tokens are in `app/globals.css`; components use the variables only. Never put mint text on white or white text on mint.
- **Surfaces:** page `--bg`, containers `--card` with a 1px `--border` hairline. No gradients, no shadows (dialogs excepted), no hero bands, no decorative art, no icon tiles.
- **Type (self-hosted in `public/fonts/`):** Space Grotesk for headings, Inter for UI and body, JetBrains Mono for figures, paths, code and logs. Weights 400, 500, 600 only. Sentence case; no uppercase tracked labels or eyebrows.
- **Spacing and shape:** 4px grid, no inline spacing values (use `.stack`, `.stack-lg`, `.sect`). Radii: 4 tags, 8 controls, 12 containers, 16 dialogs. Controls are 36px tall, 44px on touch.
- **Figures** always use the `Readout` strip with `Kpi` cells.
- **Tables** that can get narrow use `.table-wrap.stackable` with a `.cell-label` in each cell, so rows stack instead of scrolling sideways.
- **Layout:** the sidebar is always dark. On narrow screens it becomes a top bar with three equal nav tabs.
- **Status is never colour alone:** pair every colour with an icon and a word (`CircleCheck` Passed, `CircleX` Failed, `OctagonX` Stopped, `TriangleAlert` Error).
- Responsive down to 390 px with a 16 px gutter and no horizontal page scroll. Grid columns that hold tables use `minmax(0, 1fr)`, and `.table-wrap` is `position: relative` so hidden labels cannot widen the page.
- Visible focus ring (`--focus-ring`), native `<dialog>` for confirmations, toasts use `role="status"`, secret inputs are `type="password"` with a Show toggle.
- Warn before heavy tests on non-local targets; `localhost`, `127.0.0.1` and `dummyjson.com` are treated as safe.

## Wizard drafts (state that survives steps and refresh)

- `web/lib/draft.ts` keeps the test being built in `sessionStorage` (this tab only). The form is split into three slices, one per step (`sliceOf`). On a real page refresh only the current step's slice goes back to defaults (`resetStep`); the others keep their data. In-app navigation (leaving and coming back) is not a refresh: `bootId()` (kept on `window`) tells the two apart.
- **Secrets are never stored:** `stripSecrets` blanks the token, API key and password before saving. After a refresh the UI shows a note asking the user to enter them again.
- The current step lives in the URL hash (`#step-2`). Change it with `window.history.pushState(null, '', url)` plus `setStep`, never by assigning `location.hash`: Next.js ignores native hash history entries when going Back from another route. Listen to `popstate` to follow the browser's Back and Forward.
- Do not save before the draft has been restored (`ready` flag), or the defaults would overwrite it.
- Verify in a real browser: fill all three steps, Back/Next, browser Back/Forward, refresh on step 3 and on step 2, leave to History and come back, Start over.

## Next.js specifics

- Server logic lives in `app/api/**/route.ts` with `export const runtime = 'nodejs'`. Client components only where state and interaction need them.
- Live updates use `EventSource` against `/api/runs/[id]/events`.
- Never send secrets back to the client unmasked and never persist them (localStorage, files, URLs).
- Run locally from the project root: `npm run ui:install` once, then `npm run ui`, and open `http://localhost:3000`.
- k6 must be installed; `/api/health` reports it and the UI shows a clear message if it is missing.

## Verifying UI changes

Drive the real page in headless Chrome (`google-chrome --headless=new --remote-debugging-port=...`), click through every screen, capture console errors and screenshots at 1280 px and 390 px, and check `document.documentElement.scrollWidth <= clientWidth`. A change is not done until there are zero console errors and no horizontal overflow on mobile.
