---
name: pulsar-frontend-dev
description: How to write frontend code for the Pulsar web app in web/ (Next.js App Router, React, TypeScript): folder layout, component and state conventions, icons (lucide-react), CSS tokens, accessibility, data fetching and SSE, and how to verify the UI. Use whenever creating or editing files under web/ or porting the static preview in ui/.
---

# Pulsar frontend development

The app lives in `web/` (its own `package.json`; the repo root stays dependency-free so the k6 scripts keep working). Screens and flow are described in the `pulsar-ui-nextjs` skill; server rules are in `pulsar-run-engine`. This skill covers *how to write the code*.

## Stack and dependencies

Next.js 16 (App Router) + React 19 + TypeScript + `lucide-react`. `next dev` writes an `AGENTS.md` into `web/`: it says this Next.js differs from older versions, so check `node_modules/next/dist/docs/` before using an API you are unsure about. Plain CSS in `app/globals.css` with design tokens. **No Tailwind, no component library, no state library, no chart library** unless the user asks. Every new dependency needs a reason.

## Folder layout (`web/`)

```
app/                  routes only: page.tsx, layout.tsx, api/**/route.ts
components/           shared UI; one component per file, PascalCase
  ui/                 primitives: Button, Badge, Card, Field, Segmented, Tabs, Dialog, Toast
  wizard/             New-test steps
  charts/             LineChart (hand-written SVG)
lib/                  pure code. types.ts, presets.ts, templates.ts, validate.ts, format.ts
lib/server/           server only: runner.ts, results.ts, paths.ts (never imported by a client component)
```

Rules: `lib/types.ts` and `lib/validate.ts` are shared by client and server and must stay pure (no `fs`, no `process`). Anything touching `fs` or `child_process` goes in `lib/server/` and is imported only from `app/api/**`.

## Components

- Server Components by default. Add `'use client'` only when a component uses state, effects, event handlers or browser APIs. Keep the client boundary as low as possible.
- Props are typed with an `interface`; no `any`. Prefer small components (under about 150 lines) and lift state only as high as needed.
- Forms are controlled. Update state immutably; one `useState` per form object with a typed updater helper, not dozens of separate states.
- No business logic in JSX. Derive values (estimated duration, peak VUs, JSON preview) with pure helper functions in `lib/`.
- Lists use stable keys (ids), never array index when rows can be reordered or removed.

## Icons (lucide-react)

- Import named icons only: `import { Zap } from 'lucide-react'`.
- Use one wrapper convention: `size={16}` inline with text, `size={18}` in nav and buttons, `size={20}` in icon badges, `strokeWidth={2}`. Decorative icons get `aria-hidden="true"`; icon-only buttons get an `aria-label`.
- Fixed meaning per concept, reuse it everywhere: see `lib/icons.ts` for the map (Smoke `Flame`, Load `Gauge`, Stress `TrendingUp`, Spike `Zap`, Soak `Hourglass`). Add new mappings there, not inline.
- Status is never colour alone: pair every colour with an icon and a word (`CheckCircle2` Passed, `XCircle` Failed, `StopCircle` Stopped, `AlertTriangle` Error).

## Styling

- Colours, radii, shadows and spacing are CSS custom properties on `:root` (brand tokens, see the `pulsar-ui-nextjs` skill); dark mode redefines them under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and again under `:root[data-theme="dark"]`. Components never hardcode a colour.
- Class names are lowercase kebab-case, grouped by component (`.kpi`, `.kpi-label`). Utility classes are only `.row`, `.stack`, `.stack-lg`, `.muted`, `.small`, `.mono`, `.num`, `.break` (with the `.row` modifiers).
- Layout: mobile first, 16 px gutter, no horizontal page scroll at 390 px. A grid column that can hold a table uses `minmax(0, 1fr)`. Tables sit in `.table-wrap` (`overflow-x: auto`).
- Numbers use `font-variant-numeric: tabular-nums`. Respect `prefers-reduced-motion`.
- Theme: a small inline script in `<head>` sets `data-theme` from `localStorage` before paint. Wrap every storage access in try/catch.

## Accessibility (non-negotiable)

Real `<button>` and `<a>` elements; visible `:focus-visible` ring; every input has a `<label>`; tab lists use `role="tablist"`/`aria-selected`; toggles use `aria-pressed`; live regions (`role="status"`) for toasts and run status; `<dialog>` for confirmations; contrast at least 4.5:1 for text in both themes.

## Data fetching

- Reads from the client use a tiny `lib/api.ts` (typed `fetch` wrappers that throw on non-2xx with the server's message). No SWR or React Query.
- Live runs use `EventSource('/api/runs/<id>/events')`. Close it in the effect cleanup. On reconnect the server sends a full snapshot, so the client must be able to replace its state from a snapshot event.
- Never put secrets in URLs, `localStorage` or logs. Secret inputs are `type="password"`, `autoComplete="off"`.

## Performance

No unbounded re-renders: memoise only measured hot spots (the live chart); cap in-memory series to a few thousand points; throttle log output to the last 300 lines.

## Verify before saying "done"

1. `npm run build` in `web/` passes (stop `next dev` first, they share `.next/`; find the server with `ss -ltnpH | grep ':3000 '` and `kill <pid>`; `lsof` does not show these sockets here, and `pkill -f` can kill your own shell. After killing, confirm the port is free before starting. Prove which mode is serving: production pages answer with `x-nextjs-cache: HIT`) (this includes the type check). `npm run lint` if configured.
2. Start the app (`npm run dev -- -H 127.0.0.1`) and drive it in headless Chrome: every screen, at 1280 px and 390 px, light and dark.
3. Zero console errors; `document.documentElement.scrollWidth <= clientWidth` on mobile.
4. For anything that runs a test, start a real k6 run against `https://dummyjson.com` or localhost and confirm the result page, then clean up `reports/runs/`.
