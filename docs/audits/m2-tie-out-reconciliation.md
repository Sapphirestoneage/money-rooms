# M2 tie-out reconciliation log

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 during the batch (Parts 2 and 3). The workpapers are `tests/workpapers/maya-m2-planA.csv` and `maya-m2-planB.csv`; the conventions are `tests/m2-tie-out-conventions.md`; the harness is `tests/tie-out/maya-m2-tie-out.ts` (`npm run tie-out:m2`); the test is `tests/m2-tie-out.test.ts`. Tolerance: flows within $10, balances within 0.5%. Expected values were never changed.

## Where each file stands

| File | Status | Headlines |
|---|---|---|
| Plan A (default policy) | **Ties out.** 280 of 280 cells within tolerance after pass 3 | FI age 41 (retire 2042); assets at retirement $810,124; lifetime taxes and penalties $495,667; estate at 95 $267,087 (workpaper $267,086); one year earlier fails at 65. All exact |
| Plan B (conversions to the 200% ACA target, Roth layers before the 401(k)) | **Ties out through 2045.** From 2046 the engine and the workpaper differ by one 2045 conversion amount (issue 1 below); the balances it moves stay within 2% (the 2046 Roth balance itself is 7% off) | FI age 41 (retire 2042); estate $850,861 (workpaper $846,744, 0.5% over); lifetime taxes and penalties $534,093 (workpaper $534,979, 0.2% under); one year earlier fails at 68. All within 1% |

## Passes

**Pass 1.** Both files: first difference 2042 `from_401k` (engine $21,253, workpaper $27,387). Classified as an engine bug (below, fix 1). Also found: Plan A FI age came out 39 and the estate $3.8M, because the bug let the plan skip paying its retirement taxes.

**Pass 2.** Plan A: first difference 2066 `taxes_retired` (engine $5,434, workpaper $5,730, the additional standard deduction at 65); then 2076 `from_roth_earnings` taxed (fix 2). Plan B: first difference 2046 `conversion` (engine $31,300, workpaper $0): the engine converted on top of pretax draws that already filled the MAGI budget (fix 3). The 65+ deduction is a convention gap: convention 3 states the $16,100 deduction flat, so test mode holds it flat; see issue 2 for the law.

**Pass 3.** Plan A ties out. Plan B: first difference 2046 `conversion` (engine $1,908, workpaper $0), traced to the 2045 row that the workpaper does not show (issue 1). Stopped reconciling Plan B here per the three-pass rule.

## Engine fixes (each with a test in `tests/m2-engine.test.ts`; Maya ties out under M1 conventions after each)

1. **Retirement taxes were never drawn from the accounts (M2 shortfall loop).** The loop sized the year's withdrawals from a need that did not include the taxes and penalty those withdrawals create, so the plan paid them from nowhere and every M2 result was too rosy. Now the need is grossed up for last pass's withdrawal taxes and settles across passes, as the M1 path already did (M1 convention 9, M2 convention 11). `engine/projection/timeline.ts`. This is the biggest correction of the build: it moves every app M2 date and estate.
2. **Qualified Roth earnings were taxed.** Earnings drawn after 59 and a half with the five-year clock met are a qualified distribution and tax free; the engine was adding them to ordinary income. `engine/projection/drawdown.ts`, `timeline.ts`.
3. **Conversions ignored the year's pretax withdrawals.** A conversion sized to a MAGI budget counted forced income (RMDs, 72(t)) but not the pretax dollars the shortfall itself draws, so the engine converted while the draws already passed the ACA target (strategy C1 says MAGI is one shared budget). Now the sizing counts last pass's pretax draws. `timeline.ts`.

Also added for the tie-out: the `rothLayersFirst` withdrawal order (cash, taxable, Roth contributions and conversions, pretax, Roth earnings), which is the Roth ladder's access order and is now a knob the optimizer can choose; and `YearRowM2.rothDraw` and `taxableBasisEnd` so a workpaper can see the Roth layers and the taxable basis.

## Test-mode conventions applied (never used by the app)

The `m2TieOut` setting: health care before 65 as the benchmark less the ACA credit on this year's MAGI with no out-of-pocket line and no Medicaid branch, a flat amount from 65 (convention 7); premiums settled with the taxes inside the year (convention 11); the reserve counting the M1 placeholder (convention 10); the Roth IRA step instead of the deductible IRA (convention 1); the standard deduction held at $16,100 with no additional amount at 65 (convention 3).

## Workpaper issues for review

1. **Plan B, 2045 (a year the workpaper does not show), carried into 2046 and later.** Under convention 13, 2045 starts with $33,544 of unseasoned conversions (2042 to 2044 conversions less the 2043 and 2044 draws) and no contribution basis. The engine draws all $33,544, then $13,574 from the 401(k), and converts $17,725, so draws plus conversion fill the $31,300 MAGI budget and total draws ($47,118) equal spending $37,200, the premium $2,066, and taxes and penalty $7,853. The workpaper's 2046 row (unseasoned draw $10,777, then 401(k) $39,233, conversion $0) implies 2046 opened with $10,777 of conversions, which requires the 2045 conversion to have been about $6,948 smaller than its draws allow (or 2045's total draws to have been about $54,067, which no combination of the stated spending, premium, and taxes reaches). Engine 2046: conversion $1,908, 401(k) $29,393, unseasoned $17,725, MAGI $31,301, Roth end $36,139; workpaper: $0, $39,233, $10,777, $39,233, $33,749. Please check the 2045 row's conversion and Roth draw. Everything downstream (Roth end 2051 $45,773 vs $45,057, 2096 estate $850,861 vs $846,744) follows from it.
2. **The additional standard deduction at 65 (not a dispute, a simplification to confirm).** Convention 3 holds the standard deduction at $16,100 at every age. The law adds $2,050 for an unmarried filer 65 or older in 2026 (`fed.standardDeduction.2026`, `additionalAgedOrBlindUnmarried`), which the app's M2 engine applies; in the tie-out it is switched off to honor the convention. Rows 2066 and later would have about $246 less federal tax a year with it. If you would rather the workpaper follow the law, the test-mode switch comes out and the 65+ rows move.
3. **Plan B, 2096 taxable balance.** The workpaper shows $21,102 of taxable money (basis $17,813) at 95 from required-distribution surplus; the engine shows $18,573 (basis $15,813). This is downstream of issue 1 (smaller 401(k) balance, smaller required distributions), not a separate difference.

## Product questions raised (Proposed, see decisions.md)

- The app's M2 engine prices the year's marketplace premium on the prior year's MAGI (the advance credit) and does not settle it within the year; the tie-out convention settles it on the current year's MAGI (the reconciled credit). Which should the app show? The law reconciles on the current year; the advance-credit view is what people pay month to month.
- The `rothLayersFirst` order is now an optimizer knob. It is the standard Roth ladder access order and the optimizer uses it; confirm it should stay in the searched set.
