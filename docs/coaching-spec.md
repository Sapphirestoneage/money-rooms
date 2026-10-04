# Coaching spec: the weekly loop

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build, in the format of `m3-spec.md`. Docs only; nothing built. Every product decision here is Proposed (decisions C1 to C12 at the end).

---

## 1. The idea in one paragraph

Money Rooms today is a planner: you enter numbers, you see a date, you come back when something changes. Fitness apps learned how to turn a plan into a habit: a short weekly loop, one honest number, programs with an end, a recap, records, and a coach who sees the check-ins. This spec borrows the loop and refuses the parts that work by guilt. The loop is weekly, not daily, because money moves weekly at most. When the plan is solid, the right message is "nothing to do this week", and the app says it.

Everything below is a view on the one engine. The dictionary additions are records of what the person did (check-ins, program progress, records, lesson reads), never a second copy of a number.

---

## 2. Weekly money rings (Apple Fitness)

Three rings, one week each (Monday to Sunday in the person's time zone), closable, celebrated once.

| Ring | Closes when | Engine source |
|---|---|---|
| **Check in** | The person confirms their numbers this week: the Refresh card is clear (every aged value confirmed or updated) | `datedValues` and `agedValues` (M3 staleness) |
| **Move** | One action is done: a small win marked Done, a next card answered, a rough number sharpened, a program step completed | `smallWins`, `nextCard`, the program record (section 4) |
| **Learn** | One lesson card read to the end (section 12) | The lesson record |

Rings never carry over. A week with no rings closed shows the rings empty and the sentence "A quiet week. Your plan did not need you." when the readiness score (section 3) is above its line, or the single next thing when it is not.

**Dictionary addition (9.13 `weekly`).** `weeks[]` keyed by the ISO week: `{ checkIn: date | null, move: { kind, id, date } | null, learn: { lessonId, date } | null }`. Records only.

**Acceptance tests.** (1) Confirming the last aged value closes Check in for that week and no other. (2) A small win marked Done closes Move once; a second action the same week changes nothing. (3) The celebration shows once per ring per week and respects reduced motion.

## 3. Readiness score (Whoop, Oura)

One weekly number from 0 to 100, built from four parts the engine already computes, each with its own weight, and the whole thing openable: tapping the score shows the four parts, their values, and their weights, so the number is never a mystery.

| Part | Weight | Measure | Source |
|---|---|---|---|
| Runway | 35 | Months of full spending the runway stack covers, scored 0 at 0 months to 100 at 12 months (the Rule of 5 target scores 80) | `runway`, `ruleOfFive` (Level 2) |
| Rough numbers | 25 | 100 less the share of the FI number's plausible range still explained by rough or missing inputs | `materialityReport.coverage` (M3) |
| Debt pressure | 25 | 100 at a debt-to-income of 0, 0 at 50% or above, with high-interest debt weighted double | `ratios.debtToIncome`, the high-interest threshold |
| Staleness | 15 | Share of values inside their refresh window | `agedValues` (M3 staleness clocks) |

The score has a line at 70: above it the week's message is quiet; below it the next card leads. The word for the score is "readiness" (how ready the plan is for a surprise), never a grade, and the color is the brand scale, never red.

**Dictionary addition.** None stored; computed each week. The weekly record (9.13) keeps `readiness: number` for the recap and the records.

**Acceptance tests.** (1) A household with 12 months of runway, no rough numbers, no debt, and fresh values scores 100. (2) Each part's contribution shown under the score sums to the score. (3) Adding a high-interest debt lowers the score by more than the same debt at a low rate.

## 4. Guided programs (Couch to 5K, Peloton)

A program is a list of weekly steps with a start, an end, and a goal the engine can check. Steps come from the levels and tiers (M3 sections 2 and 3): each step names the item, the card, or the small win it points to. The content lives in `data/programs.json`; the person's progress lives on the household.

| Program | Weeks | Goal the engine checks | Steps (summary) |
|---|---|---|---|
| **Couch to Roth** | 8 | A Roth IRA (or Roth 401(k)) account exists with a contribution in the plan's first year | Week 1 the match; 2 the IRA limit and your income against the phase-out; 3 traditional or Roth at your bracket (lens); 4 open the account (a small win with minutes); 5 the first contribution; 6 automate it; 7 the five-year clock lesson; 8 the ordering-rules lesson and the record |
| **Debt-free sprint** | 12 | Every debt above the high-interest threshold is paid off in the plan within the sprint, or the payoff method is chosen and the extra is in the plan | Week 1 every debt and rate entered; 2 the payoff comparison; 3 choose a method; 4 to 11 the weekly extra and one small win each week; 12 the recap and the price of peace |
| **First $10K** | 16 | Cash plus reachable investments reach $10,000 (or the Rule of 5 target if lower) | Savings rate ratio, the staircase, two small wins a week in the first month, a high-yield account, the runway stack at week 8, the shock tests at week 16 |
| **Before the promo ends** | Until the promo end date | The 0% balance is paid before the promo rate ends, or the plan shows the rate after and the months it adds | Week 1 the promo end and rate after entered; then the monthly amount that clears it in time, checked weekly against the balance |

**Dictionary addition (9.14 `programs`).** `programs[]`: `{ id, startedOn, steps: { stepId, doneOn | null }[], endedOn | null, outcome: "goalMet" | "stopped" | "replanned" | null }`.

**Acceptance tests.** (1) Each program's goal check reads only engine outputs and household facts. (2) Starting a program with a step already satisfied marks it done on day one. (3) Stopping a program keeps its record and never deletes a number.

## 5. Adaptive plans (Fitbod, Future)

When an input changes materially (the FI number's plausible range moves by more than the material line, M3 section 4), an active program re-plans: steps already done stay done; remaining steps are rebuilt from the levels for the new numbers; the person sees a card with "What changed" (the inputs that moved and by how much), "Why the plan changed" (which steps were added, dropped, or moved), and the old plan kept for a week in case they want it back.

**Engine piece.** `replanProgram(program, household, before, after)` returning the new steps and the diff. Uses `materialityReport` for the trigger and the program definitions for the rebuild.

**Acceptance tests.** (1) A change under the material line never re-plans. (2) A done step is never undone by a re-plan. (3) The diff lists every step added or dropped, and nothing else.

## 6. Personal records (Strava)

Records are the best values the plan has shown, kept as facts about the past, and celebrated once when set.

| Record | Source |
|---|---|
| Highest savings rate | Weekly readiness record, from `ratios.savingsRate` |
| Earliest likely FI date | Progress history (`history-spec.md`) |
| Longest run with no new debt | Weeks in a row with no new debt row and no balance that rose |
| Round-number milestones | Net worth or cash crossing $1,000, $5,000, $10,000, $25,000, then every $25,000; the Rule of 5 target; the first $1,000 of yearly small wins |

A record is a sentence with the date it was set ("Your earliest FI date so far: 44, set on Sep 20"), shown on the recap and on a Records list. A record that is later lost is not announced; records are bests, not scores.

**Dictionary addition (9.15 `records`).** `records[]`: `{ id, value, setOn }`.

**Acceptance tests.** (1) A record is set once per value and keeps its date. (2) Round numbers fire on crossing, never on hovering. (3) The debt run resets only when a debt is added or a balance rises.

## 7. Money phases (training phases)

Every plan is in one phase at a time, read from the engine, each with its own focus for the next card and the lessons.

| Phase | Condition | Focus |
|---|---|---|
| **Base** | Runway under the Rule of 5 target, or high-interest debt | Runway, the high-interest step, the staircase |
| **Build** | Base met; working; FI date more than 5 years out | Savings rate, the match, the waterfall order, the Roth versus traditional lens |
| **Bridge** | FI date within 5 years, or retired before 59 and a half | The taxable bridge, the Roth ladder, ACA targeting, the sturdy FI date |
| **Drawdown** | Retired | Withdrawal order, conversions, RMDs, IRMAA, the guardrails |

The phase is a word on the Next screen with one sentence on what it means, and a line showing all four so people see the road. Nothing is stored; the engine reads it from the household.

**Acceptance tests.** (1) Maya at the plan date is in Build. (2) A household with a $0 runway is in Base whatever its FI date. (3) The phase changes the next card's ranking weights and nothing else.

## 8. Sunday recap (Strava, Oura)

One card each Sunday (or the first visit after): the FI date change since last Sunday (from the progress history), the rings closed, the readiness score and what moved it, the numbers that aged this week, and any record set. Four lines at most. If nothing moved and the score is above the line, the card says so: "Nothing moved this week. Your plan did not need you." The recap can be read later; the last eight are kept.

**Dictionary addition.** The weekly record (9.13) carries the recap's inputs; the card is rendered from them.

**Acceptance tests.** (1) The recap's FI date change equals the difference between the two Sundays' snapshots. (2) A quiet week produces the quiet sentence and no action. (3) Recaps are kept for eight weeks and then dropped.

## 9. Rest days (permission to spend)

When the plan is ahead (the likely FI date is earlier than the date the person set as their goal, or the readiness score has been above its line for four weeks and every ring closed), the app shows a rest-day card: the amount the plan can spend this month without moving the FI date by a month, with the sentence that spending it is part of the plan, not a lapse (the Die With Zero side of the ledger). The amount comes from the engine: the spending increase that moves the likely FI year by less than one year, found by the same search `spendingScale` already supports.

**Engine piece.** `restDayAmount(household)`: the monthly spending headroom at the material line. No new stored field.

**Acceptance tests.** (1) The headroom, added to spending, leaves the likely FI year unchanged. (2) The card never shows when the plan is behind its goal. (3) The wording passes the M4 instructing-phrase scan.

## 10. Insights from tags (Oura)

The M5 payoff work added stress ratings on debts and the M4 parking lot has mistake tags. When tags exist for at least eight weeks, the app can state patterns: "In weeks you tagged a mistake, spending on everything else was 12% higher than in other weeks." Patterns are stated with the count behind them ("in 6 of 9 weeks"), with the word "pattern", never a cause, never a diagnosis, and never about health. Fewer than eight weeks shows nothing.

**Dictionary addition (9.16 `tags`).** `weeks[].tags: string[]` on the weekly record; `mistakes[]`: `{ date, tag, note }` (the M4 parking lot item).

**Acceptance tests.** (1) No insight shows under eight tagged weeks. (2) Every insight carries its count. (3) An insight's sentence contains none of: cause, because, makes you, you should, always, never.

## 11. Coach mode (Future, Trainerize)

A coach assigns a program; the client runs the weekly loop; the coach reviews the check-ins and leaves notes, asynchronously. The data stays with the client (the Privacy page promise): coach mode works through the client's exports and the Coach pack's read-only view (`docs/packs/coach.md`), not through a shared account. A coach's notes are records attached to rows or weeks, never inputs to the engine.

**Privacy and consent requirements.**
- The client turns coach mode on, chooses what the export includes, and can turn it off; the app never suggests it.
- Every coach export is a file the client sends by their own hand; the app records the date it was made, not where it went.
- Notes come back the same way (a notes file the client imports), and the client sees every note before it is attached.
- The About and Privacy pages say what coach mode shares and that the coach is not the app.
- Coach mode is education between two people; it does not change what the app is. Whether a coach's notes on a specific person's numbers cross into personalized advice is a question for the securities attorney (readiness audit, Trust section). The spec does not answer it.

**Dictionary addition.** The Coach pack's `sharing`, `notes[]`, and `coaching.goals[]`, plus `programs[].assignedBy: string | null`.

**Acceptance tests.** (1) Nothing in coach mode changes any engine input. (2) A note is visible to the client before it is attached. (3) With coach mode off, no screen mentions a coach.

## 12. Short guided lessons (Peloton, Headspace)

Two-minute lessons attached to cards: the next card, a strategy row, a ratio, a program step. Each lesson is text (and later audio) in the coach's voice, with one idea, one example from the person's own numbers (the engine fills the blanks), and one line on what to do next if anything. Content lives in `data/lessons.json`: `{ id, title, attachedTo, body (with {placeholders}), minutes: 2, source }`. Reading to the end closes the Learn ring. Lessons never contain a number the engine did not compute.

**Dictionary addition.** `weeks[].learn` (9.13) records the lesson read; nothing else.

**Acceptance tests.** (1) Every placeholder in a lesson resolves from engine outputs or household facts, or the lesson does not show. (2) Every lesson body passes the M4 instructing-phrase scan. (3) A lesson is marked read only when scrolled to the end (or, with reduced motion, when its button is pressed).

## 13. Streaks with grace (Duolingo, done kindly)

A streak counts consecutive weeks with at least one ring closed. It has automatic freezes: two freezes a quarter are applied without asking when a week is missed, and the streak says "kept with a freeze". A lost streak is reported in one quiet line on the recap and never again. The longest streak is a record (section 6). There is no streak notification, no countdown, and no streak on the home screen.

**Dictionary addition (9.17 `streak`).** `streak: { current: number, longest: number, freezesUsedThisQuarter: number, lastWeek: string }`.

**Acceptance tests.** (1) A missed week with a freeze available keeps the streak and uses the freeze. (2) The third missed week in a quarter ends the streak. (3) The streak appears only on the recap and the Records list.

---

## 14. What we will not copy

- **No streak guilt.** No countdowns, no "don't lose your streak", no notification about a streak, no sad animal. A lost streak is one quiet line, once.
- **No public comparison of real numbers.** No leaderboards, no "people like you have", no sharing that carries dollars by default (the share card already hides them).
- **No red, no shame.** The attention color means "needs a look". A plan short of money is described ("short by $3,200 a year from 82"), never graded.
- **No engagement for its own sake.** The loop is weekly because money is weekly. When the plan is solid, the message is "nothing to do this week", and the app means it: no invented tasks, no daily streak, no notifications that are not about the person's own aged numbers.
- **No manufactured urgency.** No timers, no "only today", no scarcity.
- **No dark patterns around coach mode.** It is off by default, never suggested, and turned off in one tap.

---

## 15. Build order (proposed)

1. Weekly record, rings, and the Sunday recap (they are mostly views on M3 staleness and the progress history).
2. Readiness score and money phases (pure engine functions over existing outputs).
3. Lessons content and the Learn ring.
4. Records and streaks with grace.
5. Programs, then adaptive re-planning.
6. Rest days.
7. Insights from tags (needs eight weeks of data to be worth building).
8. Coach mode (after the audience decision and the attorney's answer).

## 16. Decisions (Proposed)

| # | Decision |
|---|---|
| C1 | The loop is weekly; nothing in the app counts days. |
| C2 | Three rings: Check in, Move, Learn; closed by engine-readable events; never carried over. |
| C3 | The readiness score is four weighted parts (runway 35, rough numbers 25, debt pressure 25, staleness 15) and is always openable to its parts. |
| C4 | Programs are content in `data/programs.json`; progress is a record on the household; goals are engine checks. |
| C5 | Re-planning triggers at the M3 material line and never undoes a done step. |
| C6 | Records are bests with dates, celebrated once, never lost in public. |
| C7 | Four money phases read from the engine, never stored. |
| C8 | The Sunday recap is at most four lines and says "nothing moved" when nothing moved. |
| C9 | Rest-day headroom is the spending increase that leaves the likely FI year unchanged. |
| C10 | Insights need eight tagged weeks, carry their counts, and use the word pattern. |
| C11 | Coach mode works through the client's exports and imports only; the attorney question stays open. |
| C12 | Streaks are weekly, with two automatic freezes a quarter, shown only on the recap and the Records list. |
