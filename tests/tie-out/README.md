# Maya tie-out: engine vs spreadsheet

First comparison, 2026-10-02, likely band, engine commit after the waterfall fix. Expected values are from `tests/households/maya.json` (maya-tie-out.xlsx). Nothing here changes an expected value; the mismatches are reported for Eli to resolve, either by changing a convention in `docs/m1-conventions.md` or by updating the spreadsheet.

Rerun the engine side with:

```
npx vite-node tests/tie-out/print-maya.ts
```

## Headline comparison

| Measure | Strategy | Spreadsheet | Engine | Status |
|---|---|---|---|---|
| FI age (likely) | all three | 42 | 40 | Open |
| Assets at retirement | maxTaxSavingsNow | 899,888 | 692,553 (at 40) | Open |
| Assets at retirement | maxTaxFreeGrowth | 777,415 | 592,193 (at 40) | Open |
| Assets at retirement | enteredOnly | 777,415 | 595,621 (at 40) | Open |
| Lifetime taxes | maxTaxSavingsNow | 540,184 | 411,964 | Open |
| Lifetime taxes | maxTaxFreeGrowth | 366,701 | 291,756 | Open |
| Lifetime taxes | enteredOnly | 416,466 | 322,993 | Open |
| One year earlier fails at | maxTaxSavingsNow | 80 | 64 | Open |
| One year earlier fails at | maxTaxFreeGrowth | 86 | 64 | Open |
| One year earlier fails at | enteredOnly | 85 | 64 | Open |
| Take-home, year 1 | | 53,780 | 54,100 (2026, annualized) | Within 1% (0.6%), passes |
| Extra traditional 401(k), year 1 | maxTaxSavingsNow | 16,532 | 17,000 (2026, annualized) or 18,047 (2027) | Open, 2.8% |

## Line by line: take-home in 2026 (annualized)

| Line | Engine | Source |
|---|---|---|
| Gross | 72,000.00 | input |
| 401(k) pre-tax | 2,880.00 | input (4% of pay, which also captures the full match) |
| Federal taxable income | 53,020.00 | 69,120 minus 16,100 standard deduction |
| Federal income tax | 6,376.40 | 5,800 plus 22% of 2,620 (Rev. Proc. 2025-32 Table 3) |
| FICA | 5,508.00 | 6.2% plus 1.45% of 72,000 |
| New York taxable income | 61,120.00 | 69,120 minus 8,000 NY standard deduction |
| New York tax | 3,135.48 | 3.9% of 8,500, 4.4% of 3,200, 5.15% of 2,200, 5.4% of 47,220 (2026 rates) |
| Take-home | 54,100.12 | |
| Spending | 37,200.00 | input |
| Loan payment | 3,120.00 | 260 a month |
| The gap | 13,780.12 | |

The spreadsheet's 53,780 is 320 lower. Using the 2025 federal standard deduction (15,750) and the pre-2026 New York rates (4%, 4.5%, 5.25%, 5.85%) gives 53,797, so the most likely cause is 2025 tax values in the spreadsheet. Eli to confirm which lines differ.

## Where the big differences come from

1. **Social Security.** The engine estimates a benefit of 21,906 a year (real) from age 67, from a PIA of 1,825.50 a month. Retirement spending in the no-go phase is 34,320, so Social Security covers about two thirds of it. That is why the engine's "one year earlier" plan fails at 64 (the bridge to 67 runs dry) and then recovers, while the spreadsheet's fails in the 80s. The spreadsheet's Social Security assumption is the first thing to compare. See convention C7.
2. **Returns and fees.** The engine uses the historical set: 6.5% real stocks, 2% bonds, 0.5% cash, with the 401(k) and Roth at 90/10 less 0.2% or 0.1% fees, and cash accounts at 0.5%. If the spreadsheet uses a single nominal rate, assets at retirement will differ by the amounts seen above.
3. **Which year is "year 1".** The engine's year 0 is the October to December 2026 stub (E8) and year 1 is 2027, when pay has grown 1.5% real. The spreadsheet's year-1 figures look like full-year 2026 values. Convention C1 and C4.
4. **Life phases.** The engine cuts discretionary spending to 85% from 75 and 70% from 85 (D17). If the spreadsheet holds spending flat, late-life balances differ.
5. **Debt in real terms.** The loan's 5.5% nominal rate becomes about 2.4% real, and the fixed payment shrinks 3% a year in real terms (C10). The loan is paid off in 2036 in the engine.
6. **Withdrawal taxes.** Pretax withdrawals before 59.5 are taxed and penalized, and the engine grosses up the withdrawal to cover that tax (C9).

## Status

Thirteen of the fourteen tie-out checks are marked as known open mismatches (take-home passes within tolerance) in `tests/households.test.ts` (they are expected to fail until resolved, and the suite will flag it when one starts passing). The three households' smoke tests pass in every band.
