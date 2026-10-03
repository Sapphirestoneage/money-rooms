# M6 self-audit scorecard

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 at the end of Phase 7. Acceptance tests from `docs/m6-spec.md` section 4.

| # | Test | Grade | Evidence |
|---|---|---|---|
| 1 | A start year uses that year's historical returns | Pass | `engine/risk/risk.test.ts`: a one-stock-account retiree grows by the 1996 real return in the 1995 start's second year |
| 2 | Success rate is the share of funded starts; the sturdy FI date is never earlier than the deterministic one | Pass | Tested on Maya |
| 3 | Worst starts name the start year and the shortfall age, ordered | Pass | Tested |
| 4 | Guardrails cut and raise at the right multiples and never cut below the floor | Pass | Tested on the adjuster alone |
| 5 | Flex FI's date is the earliest trimmed year at the threshold and never later than the sturdy date without the trim | Pass | Tested on Maya |
| 6 | Every M6 result carries the series' source and a flag while unverified | Pass | `Backtest.series` and `flags` tested |
| 7 | Filled starts are counted and reported | Pass | Tested |

## What is weaker than it looks

1. **The return series is unverified and typed from memory.** This is the biggest open item of the whole build. Until Eli replaces `data/returns-history.json` from the Damodaran (or Shiller) data, every number on the Risk screen and the Flex FI date is illustrative, and the screen says so.
2. Backtests are slow: each start is a full projection, and the sturdy-date search runs a backtest per candidate year. The screen computes after it is shown and says so.
3. Guardrails are not yet applied to the plan's own FI date (the toggle is stored; the result screen does not read it).
4. The backtest replays working years with historical returns too, which is right for sequence risk but means the accumulation path also moves with the start year.
