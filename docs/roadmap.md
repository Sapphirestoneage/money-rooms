# Roadmap

Build from the bottom up. Each milestone ships something that works end to end. Nothing from a later milestone gets built early.

---

## M1. The walking skeleton (current)

The thinnest version that runs all the way through: inputs, engine, one answer, one screen.

**In scope**

- Data model for the level-one fields in `data-dictionary.md`
- Account presets, assumption sets, and spending categories loaded from `data/`
- The engine: annual timeline, M1 tax set, savings and withdrawal orders, Social Security estimate, FI date search in three bands
- One entry screen: the level-one checklist, with "I don't" answers, roughly values, and presets
- One result screen: FI date (best, likely, worst), a balance-over-time chart, and the trace behind the likely date
- Export and import as versioned JSON, with a snapshot before import so it can be undone
- Design tokens and the base components from `design-system.md`
- Tests for every engine function, plus the three example households

**Done when**

1. A new person can answer the five required questions and see an FI date range in under five minutes.
2. **Met 2026-10-03.** Maya's household produces her hand-checked expected answers (tests/households/maya.json), tied out against both checkpoint files in tests/workpapers/. Jordan and Dev run in every band and their pieces are covered by unit tests; their hand-checked tie-outs happen before public launch.
3. Every number on the result screen can be traced to its inputs.
4. No screen file contains a calculation or a hard-coded color.

---

## M2. Net FI and the strategy engine

**Built 2026-10-04 (Proposed, awaiting Eli's review) on branches `m2-engine` and `m2-optimizer`.** The engine runs at M2 depth behind an m1/m2 switch; the Maya tie-out runs m1 and still passes.

Full spec: [`m2-spec.md`](m2-spec.md). Full tax depth, every early-access strategy as a toggle, ACA and IRMAA, the optimizer with selectable objectives, year-by-year locks, Gross FI vs Net FI, and the rules registry with tripwires.

## M3. The Ledger and the flow

**Built 2026-10-04 (Proposed) on `m3-flow`; Level 2, Level 3 milestones, and Level 5 on `levels`.**

Levels and rounds (the planets), the next card (one big, two small), the list of every roughly and unknown number, the gross and take-home reconciliation, proof of cash.

Level content specs: [`levels/level-2-resilience.md`](levels/level-2-resilience.md).

## M4. Meaning

**Spec written and built 2026-10-04 (Proposed) on `m4-meaning`: `m4-spec.md`.**

Ratio registry, metrics unlocked, lenses ("more ways to look at this"), the 4% rule as a comparison lens, the Advice Translator.

## M5. What-ifs and goals

**Built 2026-10-04 (Proposed) on `m5-whatifs`.**

Scenario blocks, goal buckets in the projection, the dream and surplus views, payoff methods including peace-first.

Level content spec: [`levels/level-3-life-plans.md`](levels/level-3-life-plans.md). Milestone dates (section 5) can ship earlier, in M3.

Level content spec: [`levels/level-5-legacy.md`](levels/level-5-legacy.md). Estate math builds on M2.

## M6. Risk

**Spec written and built 2026-10-04 (Proposed) on `m6-risk`: `m6-spec.md`. The return series is unverified (decision Q1).**

Sequence-of-returns risk and historical backtesting (Big ERN's territory), the remaining phenomena behind feature switches.

## M7. Porting v1

Bring rooms from version 1 over as views on the new foundation, one at a time. Merge candidates are decided here.

---

## Expansion packs (specs only, Proposed)

Ten pack specs in `docs/packs/` (drafted 2026-10-04, not reviewed): Earn more, Self-employed, Home, Partner, Family, Move, Health, Taxes, Debt freedom, Coach. Each names who it is for, when it unlocks, the questions it adds, the engine pieces it reuses, what is new, and whether it needs new engine capability. None is scheduled.

## Parking lot

Good ideas that wait. Each one lands in the milestone where its foundation exists.

| Idea | Earliest milestone |
|---|---|
| DRAFTT scorecard lens | M4 |
| Mistakes lens and "log a mistake" button | M4 |
| Stress rating UI and peace-first payoff | M5 |
| Windfall and bonus room | M4 (needs a complete picture) |
| Holdings and ticker classification | After M7 |
| Transaction import (bank connections) | After M7 |
| Cloud sync across devices | After M7 |
| Coach mode and client view | After the audience decision is revisited |
| Partner and household of two logic | M3 |
| Hamilton / Treasury theming | Parked |
