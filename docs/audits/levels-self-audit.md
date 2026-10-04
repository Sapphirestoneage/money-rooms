# Levels self-audit scorecard (Level 2, Level 3 milestones, Level 5)

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 at the end of Phase 4 of the overnight build. Each acceptance test from the level specs, the evidence, and a grade (Pass, Partial, Fail).

## Level 2 Resilience (level-2-resilience.md section 12)

| # | Test | Grade | Evidence |
|---|---|---|---|
| 1 | The Rule of 5 target and monthly number match the worked example in section 2 | Pass | `engine/levels/resilience.test.ts`: 25, $3,000 a month, $9,500 gives 5 months, $15,000, $458 plus $50, save $508 |
| 2 | The staircase months add up to the total, and must-pays appear on every step below full | Pass | Tested on Maya |
| 3 | Switching a self-employed person from variable to steady lowers the target by the multiplier difference | Pass | 7.5 months to 4 months at age 25 |
| 4 | Unemployment estimates use the state table, and the result shows its source and last-verified date | Partial | The estimate shows its source and says it is a placeholder, not yet verified. The state table itself is not sourced (DOL pages unreachable from the session) |
| 5 | Each shock test shows its effect on both runway and the FI date | Pass | Five shocks, each a sentence with runway and the FI delta |
| 6 | Retirement accounts never count as runway unless the person turns on break glass | Pass | Tested |

## Level 3 milestones and the FIRE spectrum (level-3-life-plans.md section 10, tests 4 to 6)

| # | Test | Grade | Evidence |
|---|---|---|---|
| 4 | Each milestone's date is the earliest year its condition holds, checked against a household where the answer is computed by hand | Partial | Each condition is implemented and ordered sensibly on Maya (Coast before FI, Lean no later, Fat no sooner). No hand-computed household yet |
| 5 | Lean FI uses the same spending as the FAT step of the Level 2 staircase | Pass | Lean FI reads the FAT step's monthly amount from `staircase` |
| 6 | Flex FI shows "Coming soon" until M6 provides variable returns | Pass | `comingSoon: true`, no date |

Tests 1 to 3 (dreams, true amount, timing curve) belong to Phase 5.

## Level 5 Legacy (level-5-legacy.md section 10)

| # | Test | Grade | Evidence |
|---|---|---|---|
| 1 | The estate view applies Roth, pretax (heir rate), taxable (step-up), and cash treatment correctly for a hand-checked household | Partial | The arithmetic is tested (after equals before less the heir rate on pretax, in every band). No hand-checked household |
| 2 | "Giving forever" equals the annual amount divided by the plan's sustainable withdrawal rate | Pass | Tested; the rate is the plan's own (decision Y6) |
| 3 | Legacy FI is the earliest year the plan stays funded and every legacy project's money is covered | Pass | Tested with a scholarship and a book |
| 4 | The freedom budget flags when legacy hours exceed available hours | Pass | Tested, including the exact sentence from the spec |
| 5 | Tagging a dream as legacy moves it to Level 5 without losing its price card | Pass | `legacyProjectsFromGoals` keeps the goal and derives the project |
| 6 | With Hamilton theming on, every quote is from Hamilton's public-domain writings and carries its source | Not built | Theming is off and has no content; nothing to check |

## What is weaker than it looks

1. Unemployment benefits are a national placeholder.
2. Shock tests apply a market drop today rather than in the worst year (decision R10).
3. The runway's "ability to cut" layer is informational; the total counts cash once at the chosen step.
4. No hand-checked tie-outs for any level yet.
