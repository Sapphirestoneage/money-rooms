# Taxes pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only.

---

## 1. The idea in one paragraph

Level 4 already runs a real federal return each year (brackets, capital gains, NIIT, the senior deduction, taxable Social Security, conversions, RMDs) and a state return from tables. This pack shows the return behind each plan year as a return (a Form 1040 shape with the lines that matter), adds the pieces that change it for some people (itemizing, tax-loss harvesting, state rules on retirement income, the saver's credit), and a "what the strategy saved" ledger that reconciles to lifetime taxes.

## 2. Who it is for

Anyone with a Level 4 plan who wants to trace a tax number, anyone who itemizes, anyone in a state that taxes retirement income differently.

## 3. When it unlocks

Level 4 unlocked (the True FI number).

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Itemized deductions: mortgage interest, state and local taxes, charitable giving | New `drawdown.itemized` with the three amounts (SALT cap rule to verify) | Fact | None (standard deduction) |
| Investment lots with basis and date (for loss harvesting) | Holdings (3.6 `holdings`, shape only) | Fact | None |
| State retirement-income treatment | `data/tax/states.json` gains `retirementIncome` per state (pension, Social Security, withdrawals) | Rule | To source per state |
| Last year's tax (for the estimated-tax safe harbor) | `drawdown.lastYearTax` (new) | Fact | None |

## 5. Engine pieces reused

- `computeFederalTaxM2` and `computeStateTax`, the ledger `rulesUsed` with sources and verified dates.
- `strategyToggles` (what each strategy saves), `planSteps`, `tripwireFlags`.
- `ratios.effectiveTaxRate`, `ratios.taxEfficiency`, the taxes lens (M4).
- `traceFor` (engine/projection/trace.ts) for the line-by-line.

## 6. What is new

| Piece | Status |
|---|---|
| The return view: a year's federal return as lines (wages, other income, AGI, deductions, taxable income, ordinary tax, gains tax, credits, total) that tie to the row's `m2.taxDetail` | Display over existing fields; adds a `credits` line |
| Itemizing: the larger of the standard and itemized deductions, with the SALT cap and the charitable limits | **New engine capability** (small) with registry rules to verify |
| Tax-loss harvesting with lots (B4): realized losses offset gains and up to $3,000 of ordinary income, carried forward | **New engine capability**: lot-level holdings |
| State rules on retirement income: exclusions for pensions and Social Security by state | Data work plus a small engine change in `computeStateTax` |
| The saver's credit (retirement savings contributions credit) for lower incomes | Small, registry rule to verify |
| The strategy ledger: lifetime taxes under the plan versus the baseline, by strategy, reconciled to the toggles | Display over `strategyToggles` |

## 7. Acceptance tests

1. Every line of the return view sums to the row's federal income tax to the dollar.
2. Itemizing is chosen only when it beats the standard deduction, and the SALT cap holds.
3. A $5,000 harvested loss offsets $5,000 of gains first, then $3,000 of ordinary income, then carries forward.
4. The strategy ledger's rows sum to the difference between the plan's and the baseline's lifetime taxes.

## 8. Not in this version

AMT, the kiddie tax, foreign tax credits, state credits, filing the return.
