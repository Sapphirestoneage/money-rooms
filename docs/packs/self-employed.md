# Self-employed pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only.

---

## 1. The idea in one paragraph

A business owner's plan has three things an employee's does not: a tax return with a Schedule C (or an S-corp return) and quarterly estimated payments, contribution room that depends on profit (solo 401(k), SEP), and a tradeoff between salary and distributions that changes both payroll tax now and Social Security later. The engine already has the business entity (dictionary 9.3), self-employment tax, and the strategy list (M2 spec F1 to F3). This pack finishes the pieces and shows them as one room.

## 2. Who it is for

Anyone with a self-employed or side-gig stream, and anyone with a business record.

## 3. When it unlocks

A stream of type `selfEmployed` or `sideGig` exists, or a business exists (9.3).

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Business expenses a year | Income stream `businessExpensesAnnual` (3.4), exists | Fact | None, roughly |
| Entity type | Business `entityType` (9.3), exists | Fact | Sole proprietor, roughly |
| Owner's salary (S-corp) | Business `ownerSalary` (9.3), exists | Decision | None |
| Solo 401(k) or SEP in place? | Workplace plan `planType` solo401k or sepIra (9.2), exists | Fact | None |
| Estimated taxes paid so far this year | New, `businesses[].estimatedTaxPaidYtd` | Fact | 0, known |
| Health insurance premiums paid by the business | New, `businesses[].healthPremiumsAnnual` | Fact | None |

## 5. Engine pieces reused

- `computeSelfEmploymentTax` and `payrollTaxesForPerson` (engine/tax/federal.ts).
- The savings waterfall's pre-tax step with the exact tax-savings loop (timeline.ts, decision E10) for solo 401(k) and SEP room.
- `limits.totalAdditions.2026` from the registry (the annual additions limit caps the solo 401(k): employee deferral plus employer share, never the $300,000 some catalogs claim; see the feature register's SPARKS corrections).
- `ratios.effectiveTaxRate`, `ratios.taxEfficiency`.

## 6. What is new

| Piece | Rule | Status |
|---|---|---|
| QBI deduction (F2) | Up to 20% of qualified business income with the taxable-income phase-out and the specified-service limits | **New engine capability**: a deduction in `computeFederalTaxM2`, a registry rule `fed.qbi.2026` to verify |
| Solo 401(k) room (F1) | Employee deferral up to the workplace limit plus the employer share (20% of net self-employment earnings after the half-SE-tax deduction), all under the annual additions limit | **New engine capability**: a room function in `engine/projection/limits.ts` |
| SEP room | 25% of compensation (20% of net for the self-employed), under the additions limit | New, same place |
| S-corp salary tradeoff (F3) | Payroll tax on salary only; the Social Security record uses salary only, so a low salary lowers the future benefit | **New engine capability**: the earnings record reads the salary, not the profit, for an S-corp |
| Self-employed health insurance deduction | Above-the-line deduction for premiums, limited to net profit | New, registry rule to verify |
| Estimated tax reminder | Four dates a year and the safe-harbor amount (100% or 110% of last year's tax) | New, a data file with the dates and the safe-harbor rule; display only |

## 7. Acceptance tests

1. A sole proprietor with $100,000 net pays the self-employment tax the IRS Schedule SE worksheet gives.
2. The solo 401(k) room never exceeds the annual additions limit, whatever the profit.
3. Switching a $120,000 profit to an S-corp with a $60,000 salary lowers payroll tax by the published rates and lowers the estimated Social Security benefit; both sides show.
4. Entity state of formation changes nothing in tax (dictionary 9.3 rule).

## 8. Not in this version

Payroll setup, bookkeeping, sales tax, multi-member partnerships, the QBI specified-service rules beyond a flag.
