# Performance budget

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build. Measured numbers are from the build session; targets are proposed.

---

## 1. Why a budget

The app runs every projection in the browser, on phones. Each FI date is a search over retirement years, each year a full tax return; the optimizer runs about a hundred projections; a backtest runs one per start year; the sturdy FI date runs a backtest per candidate year. Without a budget these will quietly grow until the screen feels broken on a mid-range phone.

## 2. Measured today (2026-10-04, this session's container)

| Measure | Value | Where |
|---|---|---|
| Production bundle (JS) | 401 KB, 122 KB gzipped | `npx vite build` |
| Full test suite | 512 tests, about 15 seconds | `npm test` |
| One projection, three bands, Maya, m2 | Under 100 ms in Node | Observed in tests |
| Optimizer, Maya | A few seconds in Node (about a hundred projections) | Result screen runs it after the date shows |
| Backtest, Maya | Several seconds; sturdy FI date tens of seconds | Risk screen computes after it is shown and says so |

Phone numbers were not measured (no device in the session). Treat Node timings as roughly 2 to 4 times faster than a mid-range phone.

## 3. The budget

| Item | Target | Hard limit | How it is kept |
|---|---|---|---|
| JS bundle, gzipped | 150 KB | 200 KB | `scripts/check-bundle-size.mjs` runs after every CI build and prints the size, a notice over the target, and a warning over the hard limit; it never fails the build (Eli, 2026-10-04). Heavy optional pieces (PDF text extraction for statement upload, the historical series) load lazily |
| First FI date on screen | Under 1 second on a mid-range phone | 2 seconds | The result screen shows the date before anything else runs; optimizer and toggles run afterwards |
| Optimizer | Under 5 seconds on a mid-range phone | 10 seconds | Coordinate search with a near-hint FI search (decision N18); cap on knob values; results cached per policy |
| Backtest and sturdy date | Under 10 seconds | 20 seconds, then show partial results | Run in a Web Worker; show the success rate as starts complete; the sturdy search narrows with the deterministic date as its lower bound |
| Interaction to paint on the entry screen | Under 100 ms | 200 ms | Field edits save and re-render only the open section (the `schedule()` pattern) |
| Memory | No row-level history kept beyond the current screen | | Timelines are recomputed, not stored; only snapshots persist (history spec) |

## 4. Rules

1. Nothing computes before it is asked for. Screens show what they have and mark what is still working ("Working out your True FI number...").
2. Long work (over 1 second) runs in a Web Worker so the page never freezes; the worker is the one place a timeline is run off the main thread. Not built yet.
3. Every new data file over 50 KB is loaded on demand, not bundled.
4. The CI size check prints the bundle size on every run so growth is seen, not discovered.
5. Reduced motion turns off every animation; animations never block a result.

## 5. Measuring on a phone

Once a phone is available: open the deployed site, enter Maya from the template, and time (with the browser's performance panel) the result screen's first paint, the optimizer's completion, and the Risk screen's backtest. Record the numbers in this file with the device and date.

## 6. Acceptance tests (when built)

1. CI warns (never fails) when the gzipped bundle passes 200 KB, and notes when it passes 150 KB. Built.
2. The result screen's first paint does not wait on the optimizer (a test that stubs `optimize` to throw after a delay and checks the date still renders).
3. The backtest runs in a worker and the page stays responsive (manual, on a phone).
