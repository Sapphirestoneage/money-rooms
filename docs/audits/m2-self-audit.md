# M2 self-audit scorecard

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 at the end of Phase 2 of the overnight build. The format is the one an auditor uses for a workpaper review: each acceptance test from `docs/m2-spec.md` section 8, the evidence, and a grade. Grades: **Pass** (tested, evidence in the repo), **Partial** (built and tested, but a stated piece is missing), **Fail** (not built or the test does not hold). No M1 scorecard exists in the repository to match, so this one sets the format.

## Acceptance tests (m2-spec.md section 8)

| # | Test | Grade | Evidence |
|---|---|---|---|
| 1 | The three example households each show Gross FI, Net FI, and the difference, with hand-checked values | Partial | `fiNumbers` computes all three for any household (`engine/optimizer/fi-numbers.ts`, tested on Maya in `engine/optimizer/optimizer.test.ts`). The result screen shows them. **Hand-checked values are not filled in**: only Eli can produce them, and only Maya has a tie-out at all |
| 2 | Every strategy toggle changes results only through the engine, and its effect is shown in years and dollars | Pass | `strategyToggles` reruns the engine with each strategy off and reports years (fresh FI search) and dollars (same retirement year). The UI only displays |
| 3 | A 40-year-old retiree's plan uses at least A1, A2, A5, B1, and C1 when they apply, and the year-by-year plan reads in plain English | Pass | `tests/m2-engine.test.ts`: Roth basis ordering (A1), the conversion ladder (A2, B1), the 0% bracket (A5), ACA targeting (C1). `planText` renders "Ages 40 to 44: Live on taxable savings. Convert about ..." (tested) |
| 4 | Locking a year's conversion changes that year only, and the optimizer re-plans the others | Pass | `tests/m2-engine.test.ts` (year lock) and `optimizer.test.ts` (locks are planned around) |
| 5 | Every rule the engine used is listed on the result's trace, with its source link and last-verified date | Pass | `TimelineResult.rulesUsed`, tested in `tests/m2-engine.test.ts`; shown in the result screen's "Rules behind this plan" section |
| 6 | Changing a value in `rules-registry.json` changes results with no code change | Pass by construction | The engine reads every M2 rate and threshold through `RuleLedger`; the only numbers in code are structural (12 months, 100 percent). No test edits the JSON at run time |

## Tie-out

| Check | Result |
|---|---|
| Maya under m1 conventions, after every engine commit | FI age 42 for all three strategies; 580 of 580 cells in both checkpoint files |
| Maya under m2 conventions, app defaults | Likely FI age 41 (m1: 40). The difference is Roth earnings penalties before 59 and a half, capital gains tax, and marketplace premiums, all absent from m1 |
| Full suite at the end of Phase 2 | See the session report for the count |

## What is weaker than it looks

1. **Health care costs are placeholders.** The benchmark premium, Part D, and the supplement are marked lookUp (open question O3). The credit mechanics are tested; the dollars are not sourced.
2. **State taxes in retirement** still follow M1 (every state's brackets on federal AGI). States that exempt retirement income or Social Security are not modeled (strategy B10).
3. **72(t) annuitization** is approximated with the Single Life table (decision N13).
4. **The optimizer is a coordinate search**, not an exhaustive one (decision N6 accepted this). It can miss a combination that only works when two knobs move together, beyond the two pairs it sweeps.
5. **Hand-checked values for M2 do not exist yet.** Everything above is checked against the engine's own logic and against known tax arithmetic in unit tests, not against a spreadsheet.
6. **Medicaid expansion by state** is not loaded; every household is "unknown" until answered.

## Suggested next tie-out

A second workpaper for Maya at m2 depth, retiring at 42 under the ladder policy (fill the standard deduction, harvest at 0%, ACA at 200%), with columns for conversion, realized gains, federal ordinary tax, capital gains tax, the premium credit, and the Roth layers. Twenty rows would check every M2 mechanism at once.
