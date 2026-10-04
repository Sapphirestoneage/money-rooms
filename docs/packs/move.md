# Move pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only.

---

## 1. The idea in one paragraph

Moving changes spending, income, state tax, and sometimes health care and Social Security. The geo-arbitrage block prices the first two; the engine's state tables price the third if the move is dated. This pack ties them together: one block that carries a new state, a new spending factor, a new income factor, and a date, and a comparison of two or three places on the plan's own FI date and lifetime taxes. Abroad is a second step with its own rules.

## 2. Who it is for

Anyone considering another state, retiring somewhere cheaper, or living abroad for part of the plan.

## 3. When it unlocks

A `geoArbitrage` block is tried, the state field changes, or the person opens it.

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Where to (state), and when | Block `geoArbitrage` gains `state` and uses `startDates` (9.5) | Goal | None |
| Spending there as a share of here | Block question, exists | Goal | 0.7 placeholder (needs a cost-of-living source; BLS or a regional price parity series, to verify) |
| Income there as a share of here | Block question, exists | Goal | 1 |
| Abroad: country, expected tax there, months a year | New block type `abroad` with `country`, `foreignTaxRatePercent`, `monthsAbroad` | Goal | None |

## 5. Engine pieces reused

- `applyBlock` for the move; dated state changes already run through `computeStateTax` by year when the household's state is dated (M2 strategy B10).
- `healthcareLine` with the Medicaid expansion answer per state once the state list is sourced (open item from Phase 0).
- `strategyToggles` to show what a conversion after the move saves.

## 6. What is new

| Piece | Status |
|---|---|
| A state on the move block and a dated state in the timeline (the field is per household; the block overrides it from the move date) | Small: the engine already reads `hh.state`; make it dated |
| A places comparison: two or three move blocks side by side on FI date, lifetime taxes, and spending | Display over existing runs |
| Abroad: the foreign earned income exclusion for work income, a flat foreign tax placeholder on everything else, no state tax, no ACA (a private plan cost placeholder), Social Security still paid | **New engine capability** and registry rules (`fed.feie.2026`, to verify) |
| State rules on retirement income (pensions, Social Security, withdrawals) | Waits on the Taxes pack's state retirement-income table |

## 7. Acceptance tests

1. Moving from NY to TX on a dated block drops state tax to zero from the move year and never before.
2. Two move blocks compared show the same FI date as running each alone.
3. The abroad block applies the exclusion only to earned income and only for the months abroad.

## 8. Not in this version

Currency, foreign pensions, tax treaties, visas, the housing side (Home pack).
