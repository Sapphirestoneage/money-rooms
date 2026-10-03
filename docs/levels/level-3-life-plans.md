# Level 3: Life plans

**Status:** Specified ahead of time. Built during M5 (what-ifs and goals), with the milestone dates available from M3 onward.
**Owner:** Eli. **Drafted:** 2026-10-02.

---

## 1. The idea

Every dream has a price in three currencies: money, time, and milestones. Timing changes all three. Level 3 shows all of them, honestly, so a person can choose what they'd rather have instead of being told what to give up.

**Unlock:** what you can afford, and when (section 7).

---

## 2. Dreams: goal buckets and scenario blocks

Two kinds of plans, both stacked on the person's real numbers and never mixed into them.

**Goal buckets** (shape set in the data dictionary, section 5.1): name, cost (one-off or annual), age window, and priority (must, want, dream).

**Scenario blocks** (decided September 2026):
- A short questionnaire (3 to 4 questions) expands into changes to income, spending, and accounts, with national defaults, then state defaults, each tagged with confidence and editable as real quotes arrive.
- Blocks stack. Each is dated, and one block can carry several dates to compare timing side by side.
- Blocks are instances: two cars are two blocks. Duplicating asks "in addition to, or replacing?"
- Adding a block asks the person to reconfirm related blocks. No automatic changes.
- Headline for every block: change in monthly cash flow, and FI date moved.
- Types: home, car, kid, job change, sabbatical, geo-arbitrage, side hustle, inheritance, marriage.

Decision rooms remain standalone calculators that end in "Add this as a block." The Scenario Planner screen lists every block in one place.

---

## 3. The price card

Every dream shows its price in this order.

**1. The cost in time.**
> Six months in Lisbon at 32 moves your FI date 14 months later.

**2. The true amount.** What the money would become if invested instead, at the likely return, in today's dollars.
> $5,000 at 25 is about $50,000 at 65, in today's dollars.

**3. The other side of the trade.** The card never stops at the cost. It asks the person to weigh what the dream is worth to them: the memory dividend, the years they'll look back on it, the timing that only exists now. The app does not invent a dollar value for this; it gives the person room to decide. "What would you rather have?" is a real question, not a guilt trip.

**4. The best timing** (section 4).

---

## 4. Best timing

The engine slides the dream across every start age in its window and computes the cost in time at each one. The result is a curve, with markers where the cost drops.

> Lisbon at 32 costs 14 months. **After your student loan is paid off (34): 9 months. After you reach Coast FI (36): 3 months.**

**Markers** come from events already in the plan: debt payoff dates, milestone dates (section 5), scheduled income changes, and other blocks ending.

**Suggestions are offered, never imposed.** The person's chosen timing stays unless they move it. The card says "Cheapest within your window: 36" and lets them decide.

**Ways to lower the price,** shown when they apply: shift the timing, split the dream in two, or pair it with a side hustle block.

---

## 5. Milestones and the FIRE spectrum

One engine, many finish lines. Every milestone has a condition, and the engine finds the earliest date each condition holds, in every band.

### Freedom milestones

| Milestone | Condition |
|---|---|
| Walk-away money | Runway (Level 2) covers a chosen number of months with no income (default 12) |
| Start a business | Runway covers a chosen number of building months at a chosen spending step (default 12 months, DRAFTT step) |
| Sabbatical | Runway covers the sabbatical's length plus its costs, and the plan stays funded |

### The FIRE spectrum

| Flavor | Condition | Defaults |
|---|---|---|
| **Coast FI** | With no new contributions, investments grow to the FI number by the coast age; the person only covers today's spending | Coast age 65, editable |
| **Barista FI** | Investments plus part-time income cover spending (and health insurance) for life | Part-time income $20,000 a year in today's dollars, editable |
| **Lean FI** | FI at the FAT step of the Level 2 staircase, plus must-pays | From the staircase |
| **Flex FI** | FI if spending is trimmed by a set amount in years when the market is down | Trim 10%. Needs variable returns, so it arrives with M6; until then it shows "Coming soon" |
| **Slow FI** | Enjoy the journey: the most extra spending now, or the most reduction in work, that still reaches FI by a chosen age | Target age = current FI date plus 5 years |
| **FI** | Full spending covered for life | The True FI number once unlocked |
| **Fat FI** | FI at a generous spending level | 1.5 times current full spending, editable |

**Slow FI output:**
> You could spend about $6,000 more a year, or work about 20% less, and still be FI by 47.

### The spectrum view

All milestones on one line, by age, in the person's likely band:

> Walk-away money 28. Start a business 30. Coast FI 36. Lean FI 39. Barista FI 40. FI 42. Fat FI 49.

Tapping any milestone shows its condition, what moves it most, and the dreams that fit before it.

---

## 6. Dreams and milestones together

Every dream shows which milestones it moves and by how much:

> Lisbon at 32 moves Coast FI from 36 to 37 and FI from 42 to 43. Walk-away money doesn't move.

---

## 7. The unlock: what you can afford, and when

A timeline of the person's dreams against their milestones, each dream showing its price in time, its true amount, and its cheapest timing. When the plan has room, it says so: "You have room for one more dream before 40."

---

## 8. Items in this level

| Tier | Items |
|---|---|
| Easy wins | Add one dream; see your milestone line |
| Intermediate | Set priorities (must, want, dream); try a different timing; pick walk-away months |
| Advanced | Scenario blocks with real quotes; compare timings side by side; Barista and Slow FI settings |
| Expert | Stacking several blocks; Fat FI target; business runway at a custom spending step |

---

## 9. New fields for the data dictionary

| Field | Kind | Default |
|---|---|---|
| Coast age | Goal | 65 |
| Part-time income (Barista FI) | Goal | $20,000 a year |
| Fat FI multiplier | Goal | 1.5 |
| Flex FI trim | Goal | 10% |
| Slow FI target age | Goal | FI date plus 5 years |
| Walk-away months | Goal | 12 |
| Business runway (months, spending step) | Goal | 12 months, DRAFTT |

---

## 10. Acceptance tests

1. Every dream shows cost in time, true amount, and best timing, in that order.
2. The true amount equals the cost grown at the likely return to the stated age, in today's dollars.
3. The timing curve's markers match the plan's actual event dates.
4. Each milestone's date is the earliest year its condition holds, checked against a household where the answer is computed by hand.
5. Lean FI uses the same spending as the FAT step of the Level 2 staircase.
6. Flex FI shows "Coming soon" until M6 provides variable returns.
