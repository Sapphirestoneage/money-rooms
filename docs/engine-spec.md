# Engine spec

The engine turns inputs into a year-by-year timeline from today through the plan-to age, then answers questions about it. It is pure math: data in, results out. It never touches a screen, a stylesheet, or storage.

Every room in Money Rooms reads from this one engine. No room runs its own math.

---

## 1. The four steps

| Step | What happens | Accounting parallel |
|---|---|---|
| 1. Build the timeline | Turn every input into values for each year | Setting up the periods |
| 2. Apply the rules | Taxes, contributions, debt payments, withdrawals | Applying GAAP |
| 3. Roll forward | Grow balances and carry them to the next year | Closing one period into the next |
| 4. Compare to goals | Find the FI date and any shortfalls | The audit opinion |

---

## 2. Conventions

| Topic | Rule |
|---|---|
| Time step | One row per year. Year 0 is the current calendar year. |
| Stub period | Year 0 runs from the plan's as-of month through December. Its fraction is months remaining (as-of month included) over 12. In October that is 3/12. Every annual flow (income, spending, debt payments, contributions, Social Security) is multiplied by the fraction. Taxes are computed on the full year's annualized income, then multiplied by the fraction. Contribution limits are prorated the same way. Balances grow for the fraction of a year. Year 1 onward are full calendar years. See decision E8. |
| Dollars | Real (today's dollars) throughout. |
| Timing | Income, spending, and contributions happen mid-period: half the period's growth in the period they occur. For the stub period, half of the stub fraction. |
| Horizon | From year 0 through the year the person reaches plan-to age. |
| Ending | The balance left at plan-to age is reported as the estate amount. |
| Determinism | Same inputs always produce the same outputs. No randomness in M1. |

---

## 3. One year, in order

For each year, the engine runs these steps in this order. The order matters, the same way the order of closing entries matters.

1. **Ages and status.** Compute age from birth date. Determine whether the person is working or retired this year, and which life phase applies.
2. **Income.** Sum every income stream active this year, each grown by its own real rate. Streams ending at `retirement` stop in the retirement year.
3. **Pre-tax deductions.** 401(k), 403(b), HSA, and health premiums come out before tax. Contribution limits come from `data/`.
4. **Taxes.** Compute tax on the year's taxable income, including withdrawals from pretax accounts (see section 5 for M1 vs M2 depth).
5. **Spending.** Working years: current categories. Retirement years: baseline, adjusted by life phase, plus the healthcare line, plus active goal buckets (Later).
6. **Debt payments.** Pay each debt's actual payment. Apply promo rate changes on their dates. A paid-off debt's payment stops, and the gap grows.
7. **Social Security.** Pay the computed benefit from claiming age onward, scaled by the policy assumption.
8. **Surplus or shortfall.**
   - **Surplus** goes to accounts in the savings order (section 4).
   - **Shortfall** comes out of accounts in the withdrawal order (section 4). Withdrawals from pretax accounts create taxable income, so steps 4 and 8 iterate until they settle.
9. **Growth.** Grow each asset account by its blended real return (allocation times the class returns) minus fees. Grow debts by their rates.
10. **Record the row.** Store the full year: ages, every flow, every balance, taxes, and flags.

---

## 4. Default orders

These are proposed defaults, logged in `decisions.md`. Both are editable per person in later milestones.

**Savings order (surplus).** Inspired by the Money Guy Show's Financial Order of Operations.

1. Contributions that earn an employer match, up to the match
2. Debts above the high-interest threshold (default 8%)
3. HSA, if eligible
4. Roth IRA, up to the limit and income eligibility
5. Remaining workplace plan space
6. Taxable brokerage

**Withdrawal order (shortfall), M1.**

1. Cash above the emergency reserve
2. Taxable accounts
3. Pretax accounts (with the 10% penalty before 59½ in M1; access strategies in M2)
4. Roth accounts

M2 replaces this with an optimized drawdown: Roth conversion ladders, filling low tax brackets, and the order that maximizes lifetime spending.

---

## 5. Tax depth

| Milestone | Covers |
|---|---|
| **M1** | Federal ordinary income brackets and standard deduction; FICA and self-employment tax; state brackets and standard deduction per state (decision E9; no exemptions, credits, or local taxes); the 10% early withdrawal penalty |
| **M2** | Full depth: long-term capital gains brackets and basis, ACA premium subsidies, Roth conversions, full state brackets, required distributions |

Tax tables live in `data/tax/<year>.json`, sourced from the IRS and state revenue departments, with the source and date recorded in each file. Engine code never contains a tax rate.

---

## 6. The FI date

**Definition.** The FI date is the earliest year the person could stop working such that, in the chosen band, every year through plan-to age is fully funded (no shortfall that accounts can't cover).

**How it's found.** The engine tests retirement years, starting from year 0, and returns the first one that is fully funded. Each test is a full run of the timeline.

**Three bands.** The engine runs the whole search three times, once with each assumption band, and reports:

| Band | Uses |
|---|---|
| Best | High returns, low inflation, high income growth, full Social Security |
| Likely | Likely values from the active assumption set |
| Worst | Low returns, high inflation, low income growth, the low Social Security value |

**If never funded.** The result says so, and reports the shortfall and the year it begins. It never shows a fake date.

---

## 7. Outputs

| Output | Description |
|---|---|
| `timeline` | One row per year, per band |
| `fiDate` | Best, likely, and worst: year and age |
| `estate` | Balance at plan-to age, per band |
| `shortfall` | First shortfall year and amount, if any |
| `traces` | For each headline number, the inputs that produced it |

`traces` is what makes every number on screen auditable. A person can tap the FI date and see which inputs moved it most.

---

## 8. Not in M1

Sequence-of-returns risk and historical backtesting (M6). Scenario blocks (M5). Goal buckets in the projection (M5). Partner and household of two (shape exists, logic later). Payoff method comparisons (M5). Monthly cash timing (Money Calendar view).
