# Level 2: Resilience (premeditated resilience)

**Status:** Specified ahead of time. Built during M3, after M2.
**Owner:** Eli. **Drafted:** 2026-10-02.

---

## 1. The idea

"Save three to six months of expenses" is tired advice. Level 2 replaces it with a target that grows with you, a monthly number that tells you exactly what to save, and backups of the backups: every layer that keeps you standing if income stops.

**Theme: zombie readiness.** You don't have to outrun the zombies, just your friends. The level's tone is playful (original jokes and art only, no copyrighted memes or characters). The headline compares runway with peers only when the comparison comes from a sourced, published dataset; until one is sourced, it compares with the person's own target.

**Unlock:** the sturdiness view (section 9).

---

## 2. The Rule of 5

**Target:** your age divided by 5, in months of full monthly spending, adjusted for income stability.

- **Target months** = age / 5 x stability multiplier (age measured to the month)
- **Target dollars** = target months x full monthly spending

| Income stability | Multiplier | Who picks it |
|---|---|---|
| Steady | 0.8 | Tenured, government, self-employed with steady clients ("nobody can fire me") |
| Normal | 1.0 | Default |
| Variable | 1.5 | Commission, gig, self-employed with lumpy income, at-risk industry |

Multipliers are proposed defaults and editable.

**The monthly number.** Because the target grows with age, the app can say exactly what to save:

- **Monthly save** = gap / months to close + growth
- **Growth** = full monthly spending / 60 x stability multiplier

The target rises by 0.2 months every year, which is 1/60 of a month's spending every month. "Months to close" defaults to 12 and is adjustable.

> You're 25, and you spend $3,000 a month. Target: 5 months, or $15,000. You have $9,500.
> Closing the gap over a year: $458 a month, plus $50 a month to keep pace as you age. **Save $508 a month.**

When the target is met, the monthly number becomes the growth amount alone.

---

## 3. Graceful degradation: the spending staircase

In engineering, graceful degradation means a system keeps its core working as parts fail. Here, it means spending steps down in stages, and each step buys more months.

| Step | Spending kept | Built from |
|---|---|---|
| 1. Full | Everything you spend now | All spending categories plus debt payments |
| 2. DRAFTT | Debt payments, housing, food, transportation (plus therapy and taxes if the person keeps those letters on) | Categories tagged with a DRAFTT letter; retirement contributions pause, since there's no paycheck to contribute from |
| 3. FAT | Food, housing, transportation | Categories tagged F, A, T |
| 4. Food and housing | Food, housing | Transportation dropped |
| 5. Couch mode | Food only, plus must-pays | Living with family or friends; housing dropped |

**Must-pays.** Some costs don't disappear even in couch mode: health insurance, a phone, and minimum debt payments (unless a deferment or $0 income-driven payment applies). They're listed separately on every step below full, each editable, so the staircase never pretends a bill vanishes.

**Shown as a staircase:**

> Full spending: **4 months.** Down to DRAFTT: **+2.** FAT: **+3.** Food and housing: **+2.** Couch mode: **+7.** Total: **18 months.**

Each step can be read two ways, with a toggle:
- **Immediate:** how long the money lasts if you dropped to this step today.
- **Graceful path:** spend at full until a trigger, then step down (default: step down every 2 months of no income).

---

## 4. The runway stack

Runway is built in layers. Each layer adds months, measured at the person's chosen step on the staircase.

| Layer | What it adds |
|---|---|
| 1. Cash | Checking and savings |
| 2. The ability to cut | The staircase (section 3). Often the biggest layer, and the one nobody counts |
| 3. Unemployment benefits | If eligible (section 5) |
| 4. Severance | Weeks of pay, if the job offers it |
| 5. Reachable investments | Roth IRA contributions, then taxable accounts, after tax |

**Health insurance after a job loss** is added to the burn rate: COBRA cost, or the ACA option with the subsidy the person would qualify for at their reduced income. This is the cost people forget.

**Retirement accounts are not counted as runway** by default. They appear as a final "break glass" line showing the cost (tax and the 10% penalty), so the person sees what it would take without being nudged toward it.

---

## 5. Unemployment benefits

- **Eligibility:** W-2 income defaults to eligible. Self-employed and gig income defaults to not eligible. Either can be changed.
- **Estimate:** the person's state formula (share of prior wages, up to the state's weekly maximum) times the state's number of weeks.
- **Data:** a per-state table in `data/rules-registry.json`, with source, link, and last-verified date, under the same tripwire rules as every other rule. States change these often.
- **Taxes:** unemployment benefits are federally taxable; the estimate shows the after-tax amount.

---

## 6. When you can't work: disability and term life

- **Disability insurance** covers the other way income stops: you can't work, rather than losing the job. For people in their 20s it's usually the most important policy. Inputs: employer coverage (yes, no, unsure), the share of pay it replaces, and the waiting period. Output: the monthly gap it leaves and how long runway covers that gap.
- **Term life** appears only if someone depends on the person's income. Output: a coverage range based on years of support needed and debts that would pass to others.

---

## 7. Shock tests

Each test reruns the plan and shows what happens to runway and the FI date. Tests are listed by plausibility, not drama.

| Shock | Default size |
|---|---|
| Job loss | 6 months without income, with unemployment benefits if eligible |
| Market drop | 30% drop in stocks the year it would hurt most |
| Medical bill | $10,000 out of pocket |
| Disability | 12 months unable to work, with disability coverage if any |
| Car or home repair | $5,000 |

Sizes are editable. Each result reads: "A 6-month job loss: your runway covers it with 4 months to spare, and your FI date moves 8 months later."

---

## 8. Side quests: the rest of insurance

Renters, auto, umbrella, and quote shopping live in a bonus tab, played like Small wins (cards, batch mode, a running total). They never appear on the main path unless their value becomes material.

---

## 9. The unlock: the sturdiness view

**Headline:** runway in months, at full spending and through the whole staircase.

> **Zombie readiness: 18 months.** At full spending you'd last 4. Cutting back gets you to 18.

Beneath it: the Rule of 5 target and the monthly number, the staircase, the runway stack, and the shock tests.

---

## 10. Items in this level

| Tier | Items |
|---|---|
| Easy wins | Confirm cash balances; pick income stability; see your Rule of 5 number |
| Intermediate | Must-pays; unemployment eligibility; employer disability coverage |
| Advanced | Severance; health insurance after a job loss; custom shock sizes |
| Expert | Graceful path triggers; break-glass costs; term life (if dependents) |

---

## 11. New fields for the data dictionary

| Field | Kind | Default |
|---|---|---|
| Income stability | Goal (person's choice) | Normal |
| Months to close the gap | Goal | 12 |
| Must-pays (health insurance, phone, debt minimums) | Fact | From existing rows where possible |
| Unemployment eligible | Fact | From income type |
| Severance (weeks of pay) | Fact | 0 |
| Employer disability coverage (share of pay, waiting period) | Fact | Unsure |
| Dependents | Fact | None |
| Health insurance cost after job loss | Computed (COBRA or ACA) | Estimated |

---

## 12. Acceptance tests

1. The Rule of 5 target and monthly number match the worked example in section 2.
2. The staircase months add up to the total, and must-pays appear on every step below full.
3. Switching a self-employed person from variable to steady lowers the target by the multiplier difference.
4. Unemployment estimates use the state table, and the result shows its source and last-verified date.
5. Each shock test shows its effect on both runway and the FI date.
6. Retirement accounts never count as runway unless the person turns on break glass.
