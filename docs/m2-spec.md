# M2 spec: Net FI and the strategy engine

**Status:** Specified ahead of time. Do not build until M1 is done.
**Owner:** Eli. **Drafted:** 2026-10-02.

---

## 1. The idea in one paragraph

Everyone in FIRE optimizes toward a number. Money Rooms finds out what the number actually is. The classic number (25 times spending) is a **gross** number: it ignores taxes, ignores health care subsidies, ignores Social Security, and ignores every legal way to get money out of retirement accounts early. Money Rooms computes the **net** number: the smallest portfolio that funds your real, after-tax life through plan-to age, using every strategy that applies to you. For many early retirees, the net number is *lower* than the gross one, because a well-planned early retirement can pay little or no federal income tax. Showing that difference, and exactly what you'd have to do to earn it, is the product.

---

## 2. Gross FI vs Net FI

| | Gross FI | Net FI |
|---|---|---|
| Built from | Spending times 25 (the 4% rule) | The full lifetime projection with optimized drawdown |
| Taxes | Ignored | Modeled every year, all buckets |
| Health care | Usually ignored | ACA before 65, Medicare and IRMAA after |
| Social Security | Usually ignored or zeroed | Modeled, with the policy band |
| Early access rules | Ignored | Every strategy in section 4 |
| Answer | One number | A number, a date, and the plan that achieves them |

**Headline on screen:**

> The 4% rule says you need **$2.0M**. With the plan below, you need **$1.62M**. That's about **3 years** sooner.

(Numbers illustrative.) The difference between gross and net is "what doing your homework is worth," shown in dollars and in years.

Net FI can also come out *higher* than gross (for example, mostly pretax savings and high spending). The app shows that honestly too, along with the strategies that close the gap.

---

## 3. What the optimizer optimizes

The person picks one objective. The others become limits they can set.

| Objective | Question it answers | Default limits |
|---|---|---|
| **Earliest FI** | How soon can I stop, at my planned spending? | Estate floor $0, cash buffer 6 months |
| **Most spending** | How much can I spend every year without running out? (Die With Zero) | Estate floor $0, FI date fixed |
| **Least lifetime tax** | How do I keep the most from the IRS? | Spending and FI date fixed |
| **Biggest estate** | How much can I leave behind, after heirs' taxes? | Spending and FI date fixed |

**Optional limits (all toggles):** estate floor; minimum cash buffer; stay under the ACA cliff; stay under an IRMAA tier; never pay the 10% penalty; maximum years of 72(t).

### How it works (plain English)

A true mathematical optimizer over 60+ years and dozens of rules is slow and fragile. Professional planning tools instead search over a small set of **policy knobs** and run the full projection for each combination. Money Rooms does the same.

| Knob | Range searched |
|---|---|
| Roth conversion target | None, fill standard deduction, fill 10%, fill 12%, fill 22%, fill to ACA target, fill to IRMAA tier |
| Gain harvesting | Off, fill the 0% capital gains bracket |
| ACA income target | Off, 138%, 150%, 200%, 250%, 400% of the poverty line |
| Withdrawal order | Conventional, proportional, bracket-based |
| 72(t) | Off, or an amount and start age |
| Rule of 55 | Off, on (if eligible) |
| Social Security claiming age | 62 through 70 |
| Working-years contribution type | Traditional, Roth, or split |

Each combination is one full projection. The best one, by the chosen objective and within the limits, wins. The search is coarse first, then refined around the winner.

### "What would you have to do?"

Every result ends in the plan that achieved it, year by year, in plain English:

> **Ages 40 to 44:** Live on taxable savings. Convert about $26,000 a year from your 401(k) to Roth. Keep income near $40,000 to qualify for the ACA subsidy.
> **Ages 45 to 59:** Withdraw conversions from five years earlier, tax and penalty free.
> **Age 67:** Claim Social Security.

---

## 4. The strategy catalog

Every strategy is **in scope** and has a **toggle**. Toggling one shows its effect on the FI date and Net FI immediately ("Rule of 55: on. FI date moves 8 months earlier.").

Each card in the app shows: what it is, the rule, where the rule comes from (with a link), who it applies to, and what the optimizer does with it.

Milestone column: **M2** = built in M2. **M2+** = defined now, built when its foundation exists.

### A. Getting money before 59½

| # | Strategy | The rule | Source | Optimizer does | Milestone |
|---|---|---|---|---|---|
| A1 | **Roth contribution basis** | Regular Roth IRA contributions come out first and are always tax and penalty free | IRS Pub 590-B, ordering rules | Uses basis before anything taxable | M2 |
| A2 | **Roth conversion ladder** | Each conversion has its own five-year clock (starting January 1 of the conversion year) before converted principal can come out penalty free under 59½ | IRS Pub 590-B | Chooses conversion amounts each year, five years ahead of need | M2 |
| A3 | **72(t) SEPP** | Substantially equal payments for 5 years or until 59½, whichever is longer. Interest rate up to the greater of 5% or 120% of the federal mid-term rate. Changing the payments retroactively triggers the 10% penalty on all prior payments | IRS Notice 2022-6; IRC §72(t)(2)(A)(iv) | Sizes payments with all three IRS methods; never modifies once started | M2 |
| A4 | **Rule of 55** | Leaving an employer in or after the year you turn 55 allows penalty-free withdrawals from *that employer's* plan (not IRAs, not prior employers' plans). Age 50 for qualifying public safety employees | IRC §72(t)(2)(A)(v) | Keeps the last employer's plan un-rolled if this helps | M2 |
| A5 | **Taxable bridge** | Long-term gains fall in the 0% bracket up to a threshold after the standard deduction | Rev. Proc. 2025-32 | Funds early years from taxable, harvesting at 0% | M2 |
| A6 | **HSA receipts** | Qualified medical expenses can be reimbursed from an HSA years later, tax free | IRS Pub 969 | Treats saved receipts as an early-access pool | M2 |
| A7 | **Governmental 457(b)** | Distributions after leaving the employer aren't subject to the 10% penalty | IRS (457(b) rules) | Prioritizes it early if present | M2 |
| A8 | **Other penalty exceptions** | Disability, certain emergency distributions, and others | IRC §72(t) | Shown as information; not used in plans by default | M2+ |

### B. Taxes during retirement

| # | Strategy | The rule | Source | Optimizer does | Milestone |
|---|---|---|---|---|---|
| B1 | **Free conversion space** | The standard deduction ($16,100 single for 2026) shelters ordinary income, including conversions | Rev. Proc. 2025-32 | Converts at least this much in zero-income years | M2 |
| B2 | **Bracket filling** | Convert up to the top of a chosen bracket each year | Rev. Proc. 2025-32 | Searches bracket targets (section 3) | M2 |
| B3 | **0% gain harvesting** | Sell and rebuy to reset basis while gains are taxed at 0% | IRC §1(h); Rev. Proc. 2025-32 | Fills remaining 0% space after conversions | M2 |
| B4 | **Tax-loss harvesting** | Realized losses offset gains and up to $3,000 of ordinary income | IRC §1211 | Needs lot-level data | M2+ |
| B5 | **Required distributions** | RMDs start at 73 (75 for those born 1960 or later). Earlier conversions shrink them | SECURE 2.0 §107 | Converts early to avoid forced high-bracket RMDs | M2 |
| B6 | **Social Security tax torpedo** | Up to 85% of benefits become taxable as provisional income rises. Thresholds ($25k/$34k single, $32k/$44k joint) are not inflation-indexed | IRC §86 | Finishes conversions before claiming | M2 |
| B7 | **Senior deduction** | Extra $6,000 per person 65+, phasing out above $75k/$150k MAGI. Scheduled for 2025 through 2028 only | One Big Beautiful Bill Act (2025) | Applies only in years it exists | M2 |
| B8 | **NIIT** | 3.8% on investment income above $200k single / $250k joint (not indexed) | IRC §1411 | Rarely binding; modeled for accuracy | M2 |
| B9 | **Asset location** | Bonds in pretax, stocks in Roth and taxable, changes how each bucket grows | Practice, not rule | Suggests a location; shows the effect | M2+ |
| B10 | **State taxes and moving** | States differ in taxing retirement income; converting after a move can save a lot | State revenue departments | Uses dated state changes and geo-arbitrage blocks | M2 (state brackets), M5 (moves) |

### C. Health care

| # | Strategy | The rule | Source | Optimizer does | Milestone |
|---|---|---|---|---|---|
| C1 | **ACA subsidy targeting** | Premium credits for income between 100% and 400% of the poverty line (above 138% in Medicaid expansion states). Enhanced subsidies expired after 2025, so the 400% cliff is back for 2026 | IRC §36B | Treats MAGI as a budget shared between conversions, gains, and subsidy | M2 |
| C2 | **Medicaid gap awareness** | Income below 138% in expansion states moves you to Medicaid instead of credits | State Medicaid rules | Flags it; lets the person choose | M2 |
| C3 | **IRMAA** | Medicare premiums jump at income tiers, based on income from two years earlier. 2026 first tier: above $109k single / $218k joint | SSA POMS HI 01101.020 | Caps conversions in the two years before 65 and after, if limited | M2 |
| C4 | **HSA as a stealth IRA** | Triple tax advantage; after 65, non-medical withdrawals are taxed like a traditional IRA | IRS Pub 969 | Favors HSA in the savings order | M2 |

### D. Social Security

| # | Strategy | The rule | Source | Optimizer does | Milestone |
|---|---|---|---|---|---|
| D1 | **Claiming age** | 62 to 70; each year of delay past full retirement age raises the benefit | SSA | Searches 62 to 70 | M2 |
| D2 | **Top 35 years and bend points** | Benefit uses the 35 highest indexed years; early retirees keep more than expected | SSA | Explains and models | M2 |
| D3 | **Spousal and survivor** | Benefits based on a partner's record | SSA | Needs the household of two | M3+ |
| D4 | **Policy band** | Trustees project the retirement fund depleted in Q4 2032 (78% payable), combined funds 2034 (83%) | 2026 Trustees Report | Low band uses the current-law floor | M2 |

### E. Working years

| # | Strategy | The rule | Source | Optimizer does | Milestone |
|---|---|---|---|---|---|
| E1 | **Roth vs traditional** | Pay tax now or later | Practice | Decides by comparing today's rate with the planned drawdown rate | M2 |
| E2 | **Backdoor Roth** | Nondeductible IRA contribution, then convert (watch the pro-rata rule) | IRS Pub 590-A/B | Flags when income exceeds Roth limits | M2+ |
| E3 | **Mega backdoor Roth** | After-tax 401(k) contributions converted to Roth, if the plan allows | Plan rules | Asks if available | M2+ |
| E4 | **Catch-up and super catch-up** | 2026: $8,000 at 50+, $11,250 at 60 to 63 | IRS Notice 2025-67 | Uses in later working years | M2 |
| E5 | **529 to Roth** | Leftover 529 funds can roll to the beneficiary's Roth IRA, up to a lifetime cap, with conditions | SECURE 2.0 | Shown when a 529 exists | M2+ |
| E6 | **Barista FI** | Part-time income after leaving full-time work reduces withdrawals and can affect ACA | Practice | Keeps income streams that outlast retirement | M2 |

### F. Self-employed

| # | Strategy | The rule | Source | Optimizer does | Milestone |
|---|---|---|---|---|---|
| F1 | **Solo 401(k) / SEP** | Higher contribution room for business owners | IRS | Adds the room to the savings order | M2+ |
| F2 | **QBI deduction** | Up to 20% deduction on qualified business income, with limits | IRC §199A | Applied in tax calc | M2+ |
| F3 | **S-corp salary tradeoff** | Lower salary cuts payroll tax now but shrinks future Social Security | IRC; SSA | Prices both sides | M2+ |

### G. After death

| # | Strategy | The rule | Source | Optimizer does | Milestone |
|---|---|---|---|---|---|
| G1 | **Step-up in basis** | Taxable investments get a new basis at death | IRC §1014 | Values unrealized gains correctly in the estate | M2 |
| G2 | **Heirs' 10-year rule** | Most non-spouse heirs must empty inherited IRAs within 10 years | SECURE Act | Values pretax dollars to heirs at their tax rate; makes Roth more valuable for estates | M2 |
| G3 | **QCDs and giving** | Qualified charitable distributions from IRAs from 70½ | IRC §408(d)(8) | Uses giving category to lower taxable income | M2+ |

### H. Risk (M6, listed for completeness)

Sequence-of-returns risk, bond tents and glide paths, guardrails spending (Guyton-Klinger), historical backtests. These change *how sure* the plan is, not the tax math.

---

## 5. Year-by-year control ("flexible scenarios")

The optimizer fills in every year automatically. The person can **lock** any year's choice by hand, and the optimizer then optimizes *around* the locks.

| Per-year setting | Auto means | Lock example |
|---|---|---|
| Roth conversion | Optimizer picks | "Convert exactly $30,000 in 2041" |
| Gain harvesting | Optimizer picks | "Harvest nothing in 2042" |
| ACA target | Optimizer picks | "Take the ACA credit in 2043; skip it in 2044" |
| Withdrawal source | Optimizer picks | "Use the HSA receipts in 2045" |
| Work | From income streams | "Part-time $20,000 in 2046" |

Locked years show a lock icon. A plan can mix: "auto everywhere except the year I take the sabbatical."

Comparing plans side by side (optimized vs the person's own vs the 4% rule) is the payoff screen.

---

## 6. Tripwires: keeping the rules current

Tax and benefit rules change. Every rule the engine uses lives in **`data/rules-registry.json`**, never in code, with:

| Field | Meaning |
|---|---|
| `value` | The current number or rule |
| `effective` | Years it applies |
| `sunset` | The year it's scheduled to end, if any |
| `source` | The official document (IRS revenue procedure, notice, publication, code section, SSA, CMS) |
| `url` | Link to the official source |
| `lastVerified` | The date someone confirmed it |
| `watch` | Pending legislation or scheduled reviews that could change it |
| `status` | `current`, `sunsetting`, `watch`, `stale` |

**What tripwires do in the app**

1. **Plan dependency flags.** If a plan leans on a rule that's sunsetting or under watch, the result says so: "Your plan uses the senior deduction, which is scheduled to end after 2028. Without it, your FI date moves 2 months later."
2. **Stress test.** One tap reruns the plan as if each watched rule changed (the ACA cliff stays, the senior deduction ends, Social Security pays 78%).
3. **Stale warnings.** If a rule's `lastVerified` is older than its check cadence, the app marks results that depend on it.

**The update calendar (for maintaining the app)**

| When | What updates | Source |
|---|---|---|
| October | Next year's brackets, deductions, many thresholds | IRS revenue procedure |
| October/November | Contribution limits | IRS notice |
| October | Social Security cost-of-living adjustment and wage base | SSA |
| November | Medicare premiums and IRMAA tiers | CMS, SSA |
| Spring/summer | Trustees Report (Social Security policy band) | SSA |
| Fall | ACA poverty guidelines and required contribution percentages | HHS, IRS |
| Anytime | New legislation | Congress |

---

## 7. Level-two inputs M2 adds

Each sharpens a level-one field and has a default, so nothing new is required.

| Input | Attaches to | Default |
|---|---|---|
| Cost basis | Taxable accounts | 70% of balance, `roughly` |
| Roth contribution basis | Roth IRAs | 50% of balance, `roughly` |
| Conversion history (year and amount) | Roth accounts | None |
| First Roth contribution year | Person | Year of oldest Roth account |
| HSA eligible? | Person | No |
| Saved medical receipts | HSA | $0 |
| Rule of 55 allowed by plan? | Workplace plan | Unknown, shown as "check with your plan" |
| Governmental 457(b)? | Workplace plan | No |
| Planned separation age | Workplace plan | Retirement |
| Expected heir tax rate | Estate | 22% |
| Household size for ACA | Person | 1 |
| Medicaid expansion state? | State | From `data/` |

---

## 8. Acceptance tests for M2

1. The three example households each show Gross FI, Net FI, and the difference, with hand-checked values.
2. Every strategy toggle changes results only through the engine, and its effect is shown in years and dollars.
3. A 40-year-old retiree's plan uses at least A1, A2, A5, B1, and C1 when they apply, and the year-by-year plan reads in plain English.
4. Locking a year's conversion changes that year only, and the optimizer re-plans the others.
5. Every rule the engine used is listed on the result's trace, with its source link and last-verified date.
6. Changing a value in `rules-registry.json` changes results with no code change.

---

## 9. The results screen

### The True FI reveal

The True FI number is an **unlockable moment**, not a default row.

**Before unlock.** The True FI slot shows a locked card: "Your True FI number unlocks after 3 more questions (about 4 minutes)." It lists the remaining drawdown inputs, each linking to its field.

**Unlock condition.** Every drawdown input in section 7 is answered, marked roughly, or marked not for me. Not having an account type (no HSA, no taxable account) counts as complete.

**Why it's gated.** The True FI number depends on drawdown details. Showing it on defaults alone would present a guess as an answer. The engine may compute it earlier for internal use, but it is not displayed until unlocked.

**The reveal.**
1. The number animates from the FI number to the True FI number.
2. It lands on the difference, in years and dollars: "Doing your homework is worth 3 years and $380,000."
3. The plan's top three strategies are listed beneath it ("Roth conversion ladder, 0% gain harvesting, ACA credits").
4. With reduced motion turned on, the result appears without animation.

**After the reveal.** It becomes a normal row with a replay button. If later changes move the True FI number significantly, a smaller "your True FI number changed" moment shows the before and after.

**Share card.** Shows years gained and the strategies used. Never shows balances or dollar amounts unless the person turns them on.
