# Performance budget

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build. Measured numbers are from the build session; targets are proposed.

---

## 1. Why a budget

The app runs every projection in the browser, on phones. Each FI date is a search over retirement years, each year a full tax return; the optimizer runs about a hundred projections; a backtest runs one per start year; the sturdy FI date runs a backtest per candidate year. Without a budget these will quietly grow until the screen feels broken on a mid-range phone.

## 2. Measured (2026-10-04, Playwright on the built site, Chromium, 360 by 740, Maya with the Level 4 inputs so the True FI card runs the optimizer)

CPU throttling is Chromium's `Emulation.setCPUThrottlingRate`; 4x is the usual stand-in for a mid-range phone, 6x for a slow one.

| Measure | 1x | 4x (mid-range phone) | 6x (slow phone) |
|---|---|---|---|
| **Before the worker:** first paint of the FI date | 2.3 s | 5.1 s | 6.9 s |
| **Before the worker:** optimizer, toggles, and stress test done | 2.4 s | 5.1 s | 7.0 s |
| **After the worker:** first paint of the FI date | (filled below) | | |
| **After the worker:** optimizer, toggles, and stress test done | | | |

Before the worker the two numbers were the same: the optimizer started in a timeout right after the first render and held the main thread, so the FI date was not painted until the whole search finished. That missed the first-paint target (1 second) and limit (2 seconds) at every throttle, and sat at the optimizer limit's edge at 6x.

Other measures (Node, this session): the full test suite is 546 tests in about 15 seconds; one projection of three bands for Maya under m2 is under 100 ms; the production bundle is 130 KB gzipped.

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
2. Long work (over 1 second) runs in a Web Worker so the page never freezes. Built 2026-10-04 for the result screen's optimizer, toggles, and stress test (`ui/workers/optimizer.worker.ts`), with a staged progress note on the True FI card and a main-thread fallback where workers are unavailable. The Risk screen's backtests still run on the main thread (next).
3. Every new data file over 50 KB is loaded on demand, not bundled.
4. The CI size check prints the bundle size on every run so growth is seen, not discovered.
5. Reduced motion turns off every animation; animations never block a result.

## 5. Measuring on a phone

Once a phone is available: open the deployed site, enter Maya from the template, and time (with the browser's performance panel) the result screen's first paint, the optimizer's completion, and the Risk screen's backtest. Record the numbers in this file with the device and date.

## 6. Acceptance tests (when built)

1. CI warns (never fails) when the gzipped bundle passes 200 KB, and notes when it passes 150 KB. Built.
2. The result screen's first paint does not wait on the optimizer (a test that stubs `optimize` to throw after a delay and checks the date still renders).
3. The backtest runs in a worker and the page stays responsive (manual, on a phone).
