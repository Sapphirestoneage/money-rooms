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
| Timing | Income, spending, contributions, withdrawals, and debt payments happen mid-period. An account's opening balance earns the full period's rate. Its net flow during the period earns half the period's rate: flow x rate / 2 in a full year. This is simple halving, not half-year compounding. In the stub period, the period's rate is the annual rate compounded over the stub fraction, and flows earn half of that. |
| Horizon | From year 0 through the year the person reaches plan-to age. |
| Ending | The balance left at plan-to age is reported as the estate amount. |
| Determinism | Same inputs always produce the same outputs. No randomness in M1. |

---

## 3. One year, in order

For each year, the engine runs these steps in this order. The order matters, the same way the order of closing entries matters.

1. **Ages and status.** Compute age from birth date. Determine whether the person is working or retired this year, and which life phase applies.
2. **Income.** Sum every income stream active this year, each grown by its own real rate. Streams ending at `retirement` stop in the retirement year. A stream ending on a date is paid through that month, so its last year counts only the months it is paid. Unemployment benefits are ordinary taxable income with no payroll tax.
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

**Savings waterfall (surplus).** Surplus fills each account up to its legal limit, then flows to the next. Limits and eligibility come only from data/rules-registry.json.

Steps that apply to everyone, in every strategy:
1. Contributions that earn an employer match, up to the match
2. Debts above the high-interest threshold (default 8%)

Then the order depends on the savings strategy:

| Step | Max tax savings now | Max tax-free growth |
|---|---|---|
| 3 | HSA, if eligible | HSA, if eligible |
| 4 | Traditional 401(k)/403(b) to the limit | Roth IRA to the limit (backdoor if over the income limit) |
| 5 | Governmental 457(b) to its separate limit, if available | Roth 401(k) to the limit |
| 6 | Traditional IRA, if deductible; otherwise Roth IRA (backdoor if over the income limit) | Governmental 457(b) (Roth if offered) |
| 7 | Mega backdoor Roth, if the plan allows (up to the total additions limit) | Mega backdoor Roth, if the plan allows |
| 8 | Taxable brokerage | Taxable brokerage |

"Entered only" uses the person's entered contributions, then Roth IRA, then taxable.

**The loop.** Pretax contributions lower taxes, which raises the surplus. For each year: guess the extra pretax amount, compute the tax saved, add it back to the surplus, and repeat until the change is under $1 or the legal limit is reached. Finish with one exact step: at the current marginal rate m, contribution = (surplus + tax saved at the last guess - m x last guess) / (1 - m), capped at the limit. Any remainder flows to the next step. Catch-up limits apply automatically by age.

**Withdrawal order (shortfall), M1.**

1. Cash above the emergency reserve
2. Taxable accounts
3. Pretax accounts (with the 10% penalty before 59½ in M1; access strategies in M2)
4. Roth accounts
5. The emergency reserve itself, last

**The emergency reserve** is 6 months of that year's spending: working spending in working years, retirement spending in retired years. Level 2 (Resilience) will later replace the flat 6 months with the Rule of 5 target.

**Accounts the engine adds.** When the waterfall needs an account the person has not listed (a Roth IRA, a Roth 401(k), a taxable brokerage, an HSA, or a traditional 401(k) for the match), the engine adds an empty one from that preset, with the preset's allocation and fee. Each added account is marked in the output and flagged on the result screen. Nothing is added to the person's stored data.

**Roth 401(k).** Roth 401(k) contributions go to their own account at the Roth 401(k) preset's fee. When drawing from Roth money, the Roth 401(k) is drawn before the Roth IRA (higher fee first).

**M1 limitation (flagged).** Roth withdrawals are treated as tax- and penalty-free at any age. In reality only contributions are; earnings withdrawn before 59 and a half are taxed and penalized. M2 applies the ordering rules using contribution basis. Until then, early-retirement results that lean on Roth money are optimistic, and the result screen says so when a plan draws Roth money before 59 and a half.

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
| `waterfall` (per year) | The step log: each savings waterfall step that took money that year, in order, with its amount, the tax it saved, and what was left after it |
| `fromReserve` (per year) | How much of that year's cash withdrawals came out of the emergency reserve itself |
| `flags` | Plain sentences for the result screen: accounts the engine added, estimates in use, and M1 limitations a plan leans on |
| `accounts` | Every account in the timeline, marking the ones the engine added |

`traces` is what makes every number on screen auditable. A person can tap the FI date and see which inputs moved it most. In M1 the FI date trace is measured directly: each input is nudged in a plain way (spending 10% more, stocks 1 point lower, no Social Security), the search is rerun, and the inputs are ranked by how many years the date moves. Other headline numbers explain their inputs in words; ranked traces for them come later.

---

## 8. Data files the engine reads

The engine contains no rates, limits, or rule parameters. It reads them from these files, each validated when loaded.

| File | Holds |
|---|---|
| `data/account-presets.json` | Account types and the fields each one fills |
| `data/spending-categories.json` | Categories, essential or discretionary, and whether each continues in retirement |
| `data/assumption-sets.json` | Returns, inflation, income growth, the Social Security policy band, plan-to age bounds |
| `data/life-phases.json` | Life phase ages and discretionary multipliers (D17) |
| `data/tax/2026.json` | Federal brackets, standard deduction, FICA, self-employment tax, the penalty, contribution limits, and every state's brackets |
| `data/social-security/2026.json` | Bend points, the benefit formula, full retirement ages, early and delayed claiming factors |
| `data/engine-defaults.json` | Rule parameters: the high-interest threshold (O2), the emergency reserve months (E13), the assumed work start age for the Social Security estimate, the penalty-free age, and the estimated minimum payment for a debt that has none entered |
| `data/rules-registry.json` | M2's rules with sources and tripwires. Not read by the M1 engine: its entries are unverified until M2 |

M1 takes contribution limits from `data/tax/2026.json`, where they are sourced and dated. Section 4 names the rules registry as their home; that move happens in M2, when the registry's entries are verified.

**Test-only settings.** A hand tie-out can impose a fixed Social Security amount and a retirement healthcare line through the timeline's `testSettings` input, and can pass a substitute tax table. The app never sets them. See `tests/tie-out-conventions.md`.

---

## 9. Not in M1

Sequence-of-returns risk and historical backtesting (M6). Scenario blocks (M5). Goal buckets in the projection (M5). Partner and household of two (shape exists, logic later). Payoff method comparisons (M5). Monthly cash timing (Money Calendar view).
