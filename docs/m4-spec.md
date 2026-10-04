# M4 spec: Meaning

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build, following the format of `m3-spec.md`. Built on branch `m4-meaning` right after drafting; every product decision here is logged as Proposed (decisions K1 to K6).

---

## 1. The idea in one paragraph

M1 to M3 give a person numbers. M4 gives them meaning: what the numbers say about their life, in ratios anyone can repeat, in lenses that show the same plan from a different angle, and in a translator that takes the advice everyone hears and says which parts apply to this person and which to unlearn. Nothing in M4 is new data. Every ratio, lens, and verdict is computed from the household and the engine's results, and every one says where it came from. Results describe what the numbers show; they never instruct.

---

## 2. The parts

### 2.1 The ratio registry

Every ratio lives in `data/ratios.json` with the same shape, so a screen can show any of them the same way and a reader can check the arithmetic.

| Field | Meaning |
|---|---|
| `id` | Stable id |
| `name` | Plain name ("Savings rate") |
| `formula` | The arithmetic in words, naming dictionary fields ("saving divided by take-home pay") |
| `inputs` | The engine outputs or stored fields it reads |
| `unit` | `percent`, `years`, `months`, `ratio`, `dollars`, `hours` |
| `unlockLevel` | 1 to 5: the level whose content gives the ratio meaning |
| `sentence` | A template with the number in it ("You save {value} of your take-home pay.") |
| `bands` | Optional plain-word ranges, never a verdict ("under 10%: most of your pay is spoken for") |
| `lenses` | Which lenses show it |

The registry starts with: savings rate, the gap, years of spending saved, FI progress, effective tax rate, real hourly wage (Level 1); runway months, debt-to-income, housing share (Level 2); dream load (Level 3); tax efficiency ratio, True FI gap (Level 4); heirs' share (Level 5). Values are computed by the engine each time, never stored (D2).

### 2.2 Metrics unlocked by level

A ratio shows once its level is passed, or once the person asks for it. Before that it sits as a locked line with the level's name, the same way the True FI number waits for its inputs. Nothing is hidden on purpose; the gate keeps a ratio from appearing before its inputs exist.

### 2.3 Lenses: "more ways to look at this"

A lens is a view of the same plan from one angle. Each has a one-sentence idea, the ratios it shows, and a comparison to the plan's own numbers. Lenses never run their own math: the engine supplies every figure.

| Lens | Idea | Compares |
|---|---|---|
| **The 4% rule** | 25 times spending is the number everyone optimizes toward | Gross FI (25 times spending), the year the plan's assets reach it, Net FI and the True FI date from M2 |
| **Shockingly simple math** | Your savings rate alone sets years to FI, at one return | The savings-rate table's years against the plan's own FI date |
| **The DRAFTT scorecard** (optional, decision M1) | Six letters of the budget as shares of take-home: Debt, Rent, Automobile, Food, Therapy, Taxes | Each letter's share with a plain range; therapy and taxes are optional letters |
| **Hours** | Every cost in hours of your real hourly wage | Spending categories and debts in hours |
| **Taxes** | What the IRS takes over a lifetime and why | Lifetime taxes, effective rate, the strategies that lower them |

### 2.4 The Advice Translator

Common advice, one line each, each with a rule that reads the household and says: **applies**, **partly**, or **unlearn**. Every verdict carries one sentence with the person's own numbers. The list lives in `data/advice.json`.

| Advice | What decides |
|---|---|
| Save three to six months of expenses | Replaced by the Rule of 5 target (Level 2) |
| Pay off all debt before investing | Only debt above the high-interest threshold (O2) comes before the match; the rest does not |
| Max your 401(k) | The match first, then by strategy; a Roth IRA may come first under tax-free growth |
| Never touch retirement money before 59 and a half | Unlearn: Roth basis, the rule of 55, 72(t), and governmental 457(b) are all penalty free when they apply |
| You need 25 times your spending | Partly: that is Gross FI; the True FI number may be lower |
| Don't count on Social Security | The policy band already discounts it to the current-law floor in the worst band |
| Roth is always better when you're young | Depends on today's bracket against the planned drawdown bracket (strategy E1) |
| Rent is throwing money away | Depends on the home block's headline, not a rule |
| Keep a budget by category | Applies if spending is one total; the proof of cash says whether the total holds |
| An emergency fund must be cash | Partly: the runway stack counts the ability to cut, benefits, and reachable investments |

---

## 3. Data dictionary additions

None. M4 stores nothing. Which lenses a person has turned on, and whether the DRAFTT scorecard's optional letters are on, are display preferences.

---

## 4. Acceptance tests

1. Every ratio in the registry has a formula, inputs, a unit, an unlock level, and a sentence, and the engine computes each one for the three example households without error.
2. The savings rate equals saving divided by take-home pay for Maya, within a dollar of the engine's year-one row.
3. A ratio whose level is not passed is reported locked, and shows once the level passes or the person asks.
4. The 4% rule lens shows Gross FI, the year assets reach it, Net FI, and the difference, and the numbers equal M2's.
5. The Shockingly simple math lens's years to FI match the table for the person's savings rate, and the comparison names the gap to the plan's own date.
6. The DRAFTT scorecard shows six shares that add up to at most 100% of take-home, with therapy and taxes switchable.
7. The Advice Translator gives every line a verdict and a sentence with the person's numbers, and "never touch retirement money before 59 and a half" reads unlearn for a household with a Roth IRA.
8. No sentence in M4 instructs: a test scans every sentence for "you should", "you must", and "you need to".

---

## 5. Not in M4

The mistakes lens and "log a mistake" (parking lot), windfall and bonus room (parking lot, needs a complete picture), DRAFTT art and theming.
