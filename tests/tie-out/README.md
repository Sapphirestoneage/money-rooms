# Maya tie-out: engine vs workpaper

**Status: tied out 2026-10-03** against `tests/workpapers/maya-checkpoints.csv` (entered only) and `tests/workpapers/maya-checkpoints-taxfree.csv` (max tax-free growth), under the conventions in `tests/tie-out-conventions.md`.

## What is checked

- **Headline figures, all three strategies:** FI age (exact), assets at retirement, lifetime taxes, the age a one-year-earlier retirement first falls short, and the entered-only estate at 95.
- **Checkpoint rows:** 20 hand-calculated years in each file, 29 columns each, 1,160 cells in all. Flows must match within $10 and balances within 0.5%.

These run as ordinary tests in `tests/households.test.ts`, so any engine change that moves Maya's numbers fails the suite.

## How to see the numbers

```
npm run tie-out:compare
```

prints the FI age and headline figures for each strategy, then compares each checkpoint file column by column and names the first difference if there is one.

```
npm run tie-out
```

prints Maya under the app's own defaults (computed Social Security, New York brackets, the October stub year), which is what the result screen shows. Those numbers differ from the workpaper by design: the workpaper fixes a few inputs so the method can be checked by hand.

## The test-only settings

Set in `tests/tie-out/maya-tie-out.ts`. The app never uses them.

| Setting | Tie-out | App |
|---|---|---|
| Plan date | January 2026, a full first year | Today, with a stub first year (decision E8) |
| Social Security | $20,000 a year from 67 | Computed from the earnings record |
| Healthcare in retirement | $7,200 before 65, $3,600 from 65 | No sourced line yet (open question O3) |
| New York tax | Flat 5%, no state standard deduction | The state's brackets and standard deduction (decision E9) |

## How the reconciliation went

| Round | First difference | Cause | Resolution |
|---|---|---|---|
| 1 | 2043 FromCash: 0 vs 10,341 | Engine drew cash first; workpaper held it as a reserve | Engine: 6-month reserve, drawn last (decision E13) |
| 1 | Mid-year growth off by a few dollars | Half-year compounding vs half the annual rate | Engine: flows earn half the rate (decision E14) |
| 2 | 2060 401(k) end: 15,264 vs 15,343 | Workpaper's gross-up overshot by about $8 a year | Workpaper corrected |
| 2 | Tax-free assets 0.64% low | Roth 401(k) fee: 0.2% preset vs 0.1% in the workpaper | Workpaper corrected; Roth 401(k) drawn before Roth IRA (decision E16) |
| 3 | 2027 TakeHome: 54,454 vs 54,485 (tax-free) | Match top-up went to Roth; workpaper kept 4% traditional | Engine: contributions are a percent of pay and keep their account type (decision E15) |
| 4 | None | | Tied out |
