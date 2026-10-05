# Contracts, per planet

A contract is a planet's inputs (what it reads from the hub), its owned facts (what it alone writes), and its published outputs (what it puts on the hub). A contract does not change during a card's build (`DONE.md`); a change is a decision in `DECISIONS.md` and a new card.

All amounts are monthly, in real dollars, unless the output says otherwise. Every published output carries a state: `ok`, `estimated` (a flagged default was used), `rough` (a rough input was used), `waiting` (with the inputs it needs), or `notApplicable`.

## Sun (hub)

- Owned facts: client, household, people (birth dates), filing status, state, local tax rate.
- Publishes: `ages` (each person's age at the as-of date), `householdSize`, `filingStatus`, `state`, and every other planet's outputs by name.
- The DRAFTT scorecard (Debt, Retirement, Accommodation, Food, Transportation, plus optional Taxes and Therapy) is a Sun view: shares of take-home, each read from the owning planet's published output. It owns nothing.

## Income

- Inputs: people (for per-person streams), filing status and state (for the take-home solve, via Taxes once it exists; until then a flagged default rate).
- Owned facts: income streams.
- Publishes: `monthlyGross`, `monthlyTakeHome`, `incomeType` (the dominant type), `stabilityFlag`. The coach can enter gross, take-home, or both; the planet solves the other (take-home from gross through Taxes' effective rate; gross from take-home by the inverse). When both are entered, both are kept and the implied rate is published as `impliedTaxRate` for Taxes to compare against.

## Spending

- Inputs: none from other planets.
- Owned facts: spending buckets (totals or detail lines).
- Publishes: `monthlyBaseline`, `bucketTotals` (by category), `fatFloor` (food, accommodation, transportation), `drafttShares` inputs (accommodation, food, transportation, therapy amounts).

## Debt

- Inputs: `monthlyTakeHome` (for the debt-service share).
- Owned facts: debts.
- Publishes: `totalDebt`, `monthlyDebtService`, `payoffOrderByRate`, `payoffOrderByStress`, `debtFreeDate` (by the chosen order at today's payments), `freedCashFlowByMonth` (the schedule of payments that stop as each debt clears), `monthlyRetirementShare` is not Debt's (see Investments).

## Safety Net

- Inputs: `ages` (the older person's age for the Rule of 5), `monthlyBaseline`, `fatFloor`, `monthlyDebtService` (fixed payments only), cash balances by liquidity tier from Investments.
- Owned facts: income stability rating, months to close the gap.
- Publishes: `ruleOfFiveTargetMonths` (age divided by 5), `ruleOfFiveTargetDollars`, `runwayAtFullSpending`, `runwayAtDraftt`, `runwayAtFat`, `monthlyToCloseGap`.

## Investments and Accounts

- Inputs: `ages` (contribution limits by age), `monthlyGross` (for the retirement share and the employer match).
- Owned facts: accounts.
- Publishes: `balancesByTaxBucket`, `balancesByLiquidityTier`, `annualContributions`, `remainingRoom` (under the legal limits, by account type), `monthlyRetirementShare`.

## Taxes (v1: federal plus FICA)

- Inputs: `monthlyGross` by stream type (wages, self-employment), filing status, state, pretax contributions from Investments, people's ages.
- Owned facts: none in v1 (withholding and estimated payments later).
- Publishes: `estimatedAnnualTax` (federal income tax, FICA, self-employment tax, state as an estimate), `effectiveRate`, `marginalRate`.
- Later (Taxes v2): ACA premium credits, Roth conversions, credits for dependents.

## Life Plan

- Inputs: everything published (to price events against the plan).
- Owned facts: events and goals.
- Publishes: `timeline` (the ordered list of events and goals with dates and costs), `nextEvent`.

## Measure, Simulate, Learn

Measure reads every published output and lays out the one-page plan. Simulate runs the same registry in a sandbox and publishes nothing until a Promote. Learn reads nothing.
