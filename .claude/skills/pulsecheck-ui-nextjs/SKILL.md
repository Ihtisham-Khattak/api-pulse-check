---
name: pulsecheck-ui-nextjs
description: Screens, flow, design tokens and component rules for the PulseCheck web UI (Next.js App Router). Use when creating or changing any UI page or component, or when porting the static preview in ui/ to Next.js.
---

# PulseCheck web UI (Next.js)

Status: the static, simulated preview in `ui/` (`index.html`, `styles.css`, `app.js`) is the visual spec. The real app is a Next.js (App Router) rewrite of the same screens, wired to the run engine (see the `pulsecheck-run-engine` skill). Keep dependencies minimal: React, Next.js, TypeScript. No component library unless the user asks. Charts are small hand-written SVG (see `lineChart` in `ui/app.js`) or one light library.

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
| `/new` | The three-step flow with a sticky run summary and a "What PulseCheck hands to k6" JSON panel |
| `/scenario` | Scenario builder |
| `/runs/[id]` | Live view (progress, VUs, req/s, p95, errors, chart, k6 output, Stop), then the result |
| `/history` | Past runs; tick two to compare (show change as text and arrow, not colour alone) |

Result page: verdict banner (PASSED / FAILED / STOPPED with the reason), KPI cards (requests, error rate, avg, p90, p95, p99), latency chart with the p95 limit as a dashed line, thresholds table, checks table with pass rate.

## Design rules (brand: the "Ihtisham Khattak" design system)

- **Palette:** green, white and black in a 60/30/10 balance. Tokens: `forest #0B5D3B` (primary), `emerald #0D7D4D`, `mint #3DDC84` (accent, 10%), `mint-tint #E7F6EE`, `black #0A0F0C`, `surface-alt #F6F8F7`, `ink-muted #56615B`, `line #DCE3DF`, `danger #C62828`, `warning #A15C00`. Dark theme: surface `#0A0F0C`, surface-alt `#161D19`, ink `#F2F5F3`, primary becomes mint. All defined in `app/globals.css`; components use the variables only.
- **Never** put mint text on white or white text on mint. Success text is forest on mint-tint. No gradients, no emoji cards, no left-border cards. Prefer a 1px `line` border to shadows.
- **Fonts (self-hosted in `public/fonts/`):** Space Grotesk for headings and numbers, Inter for UI and body, JetBrains Mono for paths, code and logs. Do not load fonts from a CDN.
- **Radii:** 4px inputs and chips, 8px buttons and cards, 16px hero and dialogs, pill for badges. Spacing on a 4px base.
- **Layout:** the sidebar is always a dark brand section (black). Hero is a flat forest band with a mint pulse line. Icon tiles use tones `green | ink | amber | red | grey`.
- **Status is never colour alone:** pair every colour with an icon and a word (`CircleCheck` Passed, `CircleX` Failed, `OctagonX` Stopped, `TriangleAlert` Error).
- Responsive down to 390 px with a 16 px gutter and no horizontal page scroll. Grid columns that hold tables use `minmax(0, 1fr)`, and `.table-wrap` is `position: relative` so hidden labels cannot widen the page.
- Visible focus ring (`--focus-ring`), native `<dialog>` for confirmations, toasts use `role="status"`, secret inputs are `type="password"` with a Show toggle.
- Warn before heavy tests on non-local targets; `localhost`, `127.0.0.1` and `dummyjson.com` are treated as safe.

## Next.js specifics

- Server logic lives in `app/api/**/route.ts` with `export const runtime = 'nodejs'`. Client components only where state and interaction need them.
- Live updates use `EventSource` against `/api/runs/[id]/events`.
- Never send secrets back to the client unmasked and never persist them (localStorage, files, URLs).
- Run locally from the project root: `npm run ui:install` once, then `npm run ui`, and open `http://localhost:3000`.
- k6 must be installed; `/api/health` reports it and the UI shows a clear message if it is missing.

## Verifying UI changes

Drive the real page in headless Chrome (`google-chrome --headless=new --remote-debugging-port=...`), click through every screen, capture console errors and screenshots at 1280 px and 390 px, and check `document.documentElement.scrollWidth <= clientWidth`. A change is not done until there are zero console errors and no horizontal overflow on mobile.
