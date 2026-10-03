# M3 spec: The Ledger and the flow

**Status:** Specified ahead of time. Do not build until M2 is done.
**Owner:** Eli. **Drafted:** 2026-10-02.

---

## 1. The idea in one paragraph

Past versions felt half-filled: people hunted through rooms for empty boxes, couldn't tell what was done, and never knew what to do next. M3 fixes that with one rule borrowed from audit: **work on what's material first.** The engine measures how much every missing or rough number could move the result, and how much every possible move is worth. The app always shows the single most valuable next thing, says what it's worth and how long it takes, and lets people skip anything that isn't worth their time.

---

## 2. Levels (coverage)

Levels add new ground. Each ends in an unlock. Levels are never locked: people can jump anywhere, and the next card suggests the best order.

| Level | Covers | Unlocks |
|---|---|---|
| 1. Basics | Birth date, state, income, spending, accounts | Your first FI date range |
| 2. Resilience | Emergency fund, insurance, job-loss cushion | How sturdy your plan is |
| 3. Life plans | Goal buckets, scenario blocks (home, sabbatical, kids, moves) | What you can afford, and when |
| 4. Optimize and draw down | Strategies, savings strategy, Social Security record, cost basis, Roth basis, plan details | The optimizer, the year-by-year plan, and the True FI reveal (see m2-spec.md section 9) |
| 5. Legacy | Estate, heirs, giving | The estate view |

## 3. Tiers (difficulty, inside every level)

| Tier | Feel | Level 4 examples |
|---|---|---|
| Easy wins | Minutes, obvious payoff | Roth or traditional at work; Social Security claiming age |
| Intermediate | Some reading | Roth conversion ladder; saving HSA receipts |
| Advanced | Real planning | ACA income targeting; 0% gain harvesting |
| Expert | Niche, high skill | 72(t); mega backdoor Roth; IRMAA planning |

The format follows the FI Skill Tree's tiered cards. Money Rooms content stays separate from that build.

---

## 4. Materiality

Three lines, taken directly from audit practice.

| Line | Rule | Default | Adjustable |
|---|---|---|---|
| **Clearly trivial** | Items worth under this amount are never asked on the main path. They live in the Small wins tab (section 10) | $100 a year | No |
| **Material (accuracy)** | A question is material if its plausible range moves the FI number by at least this share | 5% of the FI number | 1% to 20%. Above 5%, every result shows the attention color and a label: "Calculated at 15% materiality. Results are rougher than usual." Never red |
| **Worth it (time)** | A move or question is worth asking only if its value is at least the person's real hourly wage for each hour of effort | Real hourly wage | Yes, in settings |

**Why the FI number, not the FI date.** The engine works in whole years, so small changes may not move the date at all. The dollar figure moves smoothly. Screens can still describe impact in months.

**Plausible ranges.** To test materiality, every number has a range based on its kind:

| Kind | Range tested |
|---|---|
| Known | ±2% |
| Look it up | ±5% |
| Roughly | ±25% |
| Default (unanswered) | ±50% |

---

## 5. Items

Every question and every move is an **item** with the same shape, so the next card can rank them together.

| Field | Meaning |
|---|---|
| `id` | Stable identifier |
| `level` | 1 to 5 |
| `tier` | `easy`, `intermediate`, `advanced`, `expert` |
| `type` | `question` (sharpens the picture) or `move` (changes the outcome) |
| `effortMinutes` | Typical time to complete |
| `value` | Computed per person. Questions: dollars of FI number at stake. Moves: dollars per year and months of FI date gained |
| `why` | One plain sentence: why we're asking |
| `whereToFind` | For look-it-up questions: where the number lives ("Your Fidelity statement, top right") |
| `fields` | The data-dictionary fields it fills |

Item definitions live in `data/items.json`. Values are computed by the engine, never stored.

---

## 6. The next card

**#1 (big):** the highest value per minute, among items above the clearly-trivial and worth-it lines, preferring the lowest level not yet passed. An item from a later level jumps ahead only if it's worth at least three times the best current-level item.

**#2 and #3 (smaller):** the next two by the same ranking.

Every card shows what it's worth, how long it takes, and why we're asking:

> **Next: your 401(k) balance.** It's marked roughly and could move your FI number by $41,000 (about 14 months). About 2 minutes. It's on your Fidelity statement.

Cards can be answered inline or open the full field.

---

## 7. What "done" means

| Scale | Done when | Shown as |
|---|---|---|
| A row | Answered, roughly, look it up, or not for me | Its kind badge |
| A level | Every material item is in | "You've covered 92% of what matters" (weighted by impact, not count) |
| 100% of a level | Every item, material or not | A badge. Never required |
| The whole picture | Levels passed plus a sharpness score (impact-weighted confidence) | The Sky (section 13) |

Having none of something counts as complete. No debt means the debt questions are done.

---

## 8. Staleness and the Refresh card

Numbers age. A value's plausible range widens with time since its `asOf` date, until it's re-confirmed.

| Kind of value | Next check | Widens to roughly (±25%) by |
|---|---|---|
| Account balances | Every 3 months | 12 months |
| Debts | Every 3 months | 12 months |
| Income, spending | Every 12 months | 24 months |
| Assumptions | When the rules registry or assumption set updates | |
| Facts that don't change (birth date) | Never | |

**The Refresh card.** Shown on the dashboard whenever anything has aged:

> **4 numbers have aged.** Your brokerage balance (7 months old), checking (4 months), car loan (5 months), spending (13 months). About 6 minutes.

Opening it lists each aged number with its current value, how old it is, and when it's next due. Each one can be confirmed as unchanged (one tap) or updated. Confirming or updating restarts its clock and shows the next check date ("Next check: January"). When the card is cleared, a "since last time" line shows what changed: "Your FI date moved 3 months sooner."

**The next card still decides by materiality.** The Refresh card shows every aged number. The next card pulls in an aged number only when its widened range has become material.

---

## 9. The Rough numbers card

The same pattern for numbers that are roughly, look it up, or default:

> **6 numbers are rough.** Sharpening the top 3 covers 80% of what's at stake. About 8 minutes.

Opening it lists them sorted by materiality, each with where to find it, and a running bar showing how much of the total uncertainty is cleared as each one is sharpened. Most people can clear the majority with the first few. "Confirm all that haven't changed" is a single action.

---

## 10. Small wins

A separate tab for everything under the clearly-trivial line. For people who love to optimize, it's a set of mini-games.

**Why it exists.** One $100 item doesn't matter. Fifteen of them do. Auditors track trivial items for the same reason: individually trivial misstatements can add up to something material. Small wins does that for money.

**How it works.**

- **Batch mode.** Cards come one at a time, swipe-style: done, not for me, or later. Most take under a minute.
- **Running total.** The top of the tab always shows the sum: "12 small wins: $1,340 a year, about 4 months sooner."
- **Promotion.** When the total of open small wins crosses the material line, a card appears on the main path: "Your small wins add up to $1,340 a year. Worth an evening?"
- **Categories.** Subscriptions, phone and internet, banking fees, insurance shopping, cash back and rewards, household plans, free alternatives.

**Content rule.** Only suggest things that are legitimate and within terms of service (household family plans, not account sharing that a service prohibits).

Item definitions live in `data/small-wins.json`. Every value is a range, labeled as an estimate, and personalized where the person's data allows.

---

## 11. The first five minutes

1. Five questions: birth date, state, income, spending, accounts. Each has an "I don't" answer and the person's choice of format.
2. A small reveal: "Your first FI date: around 2043," with the best and worst range.
3. Level 1 is passed. The next card appears directly under the result.

Target: under five minutes from opening the app to the first FI date (the M1 acceptance test, carried forward).

---

## 12. Entry modes

- **Guided:** one question at a time.
- **Dump-then-sort:** type everything in any order; the app sorts it into rows.
- **Express:** every question for a level on one form.

The mode can be switched at any time, from any screen, without losing anything. A person can even use different modes for different levels. The app remembers the last choice.

---

## 13. The Sky: zoom like a globe

The Sky is how a person sees the whole picture and zooms in, like Google Earth. It's an arrangement of the Ledger's rows, never its own data.

| Zoom | Center | Around it |
|---|---|---|
| 0. Everything | You and your FI date | The areas as circles: you, income, spending, accounts, debts, taxes, goals |
| 1. An area | That area (for example, accounts) | Its rows as circles: each account |
| 2. A row | That account | Its details: balance, kind, age, what it feeds, related strategies |

- **Tap a circle to zoom in.** It moves to the center and its own circles appear around it.
- **Zoom out** with a breadcrumb trail ("Everything > Accounts > Roth IRA") or a pinch.
- **Circles show state at a glance:** fill shows coverage, a ring shows kind (known, roughly, aged), and size shows materiality.
- **Strategies appear as moons** where they apply (the Roth IRA circle shows the conversion ladder moon).
- **Motion:** a smooth zoom; with reduced motion turned on, it switches instantly.
- **Accessible alternative:** the same hierarchy as an outline list, one tap away, fully usable by keyboard and screen reader.

---

## 14. Acceptance tests for M3

1. A new person reaches a first FI date in under five minutes.
2. The next card's #1 item is always the highest value per minute under the rules in section 6, verified against the three example households.
3. Changing materiality from 5% to 15% removes items from the main path and adds the warning label to every result.
4. A balance left unconfirmed for 12 months appears on the next card if, and only if, it has become material.
5. Small wins shows a correct running total, and promotes itself to the main path when the total crosses the material line.
6. Every item card shows value, effort, and why. No card appears without all three.
7. Confirming an aged number restarts its clock, shows its next check date, and clears it from the Refresh card.
8. The Sky zooms from everything, to an area, to a row, and back, and the outline view shows the same hierarchy.
9. Switching entry modes mid-level loses nothing.

---

## 15. Accessible and changeable

- **Nothing is locked in.** Entry mode, materiality, the worth-it threshold, the results layout, theme, and every other preference can be changed at any time, from settings or in place.
- **Accessible by default:** WCAG AA contrast in light and dark themes, full keyboard use, screen-reader labels on every control, text alternatives for every chart and for the Sky, reduced motion respected, tap targets at least 44px, and layouts that hold up at large text sizes.
- **Polished:** every screen built only from the design system's components and tokens, following the style guide.
