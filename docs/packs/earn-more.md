# Earn more pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only.

---

## 1. The idea in one paragraph

Most of the app helps people spend less or keep more. This pack prices the other lever: a raise, a job change, a second stream, more hours, or fewer hours. Every option is a scenario block (M5) with its FI date moved and its change to the real hourly wage (M4 ratio `realHourlyWage`), so a person can see what an hour of extra work is worth after taxes and what a raise is worth in months of freedom. Nothing here is advice; it is prices.

## 2. Who it is for

Anyone whose gap (`ratios.gap`) is small relative to spending, anyone whose real hourly wage is low, and anyone weighing a job offer.

## 3. When it unlocks

Level 1 complete (a first FI date exists). The next card (M3 section 6) can offer it when the gap is under 10% of take-home pay, because then the income lever is worth more than the spending lever.

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| A raise or offer (new gross pay, start month) | Scenario block `jobChange` (9.5), already exists | Goal | None |
| Hours a week on a new stream, and its pay | Income stream (3.4) with `hoursPerWeek`, already exists | Fact | None |
| Fewer hours (a cut in pay for time back) | Scenario block `jobChange` with a lower pay | Goal | None |
| The hour's price: what an hour of your free time is worth to you | New, `assumptions.overrides.hourValue` (4.x), roughly | Assumption | The real hourly wage |

No new stored facts beyond the hour's price, which is an assumption the person can set and which the materiality engine already needs (the "worth it" line, M3 section 4).

## 5. Engine pieces reused

- `applyBlock` and `blockHeadline` (engine/whatifs/blocks.ts) for every option.
- `findFiDate` for the date moved.
- `ratios` (engine/meaning/ratios.ts) for the real hourly wage before and after.
- `materialityReport` for ranking options by value per minute.
- `comparePayoffMethods` is not needed.

## 6. What is new

- A "raise in months of freedom" line: the FI date moved by a raise, said as months.
- A per-hour price for a second stream after taxes at the marginal rate the engine already reports (`taxesFor(...).marginal`), so "an extra Saturday shift is worth about $118 after taxes".
- A hours-for-money table: for a stream with hours, the FI date at 20, 30, 40 hours.

**Needs new engine capability:** No. Every line is a block plus a ratio.

## 7. Acceptance tests

1. A $10,000 raise on Maya moves the FI date by the same months as a `jobChange` block with the same pay.
2. The per-hour price equals net pay per hour at the engine's marginal rate.
3. The pack shows nothing until Level 1 is complete.

## 8. Not in this version

Career ladders, negotiation scripts, benefits comparison between offers (health plan, match) beyond the match already entered on a stream.
