# M4 self-audit scorecard

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 at the end of Phase 6. Acceptance tests from `docs/m4-spec.md` section 4.

| # | Test | Grade | Evidence |
|---|---|---|---|
| 1 | Every ratio has formula, inputs, unit, unlock level, sentence; computed for the three households without error | Pass | `engine/meaning/meaning.test.ts` |
| 2 | Savings rate equals saving over take-home for Maya's first full year | Pass | Tested against the engine's own row |
| 3 | A locked ratio is reported locked and shows when the level passes or the person asks | Pass | Tested |
| 4 | The 4% rule lens equals M2's Gross FI, Net FI, year, and difference | Pass | Same `fiNumbers` function; tested |
| 5 | Shockingly simple math matches the table for the savings rate and names the plan's own years | Pass | Formula tested at 50%, 100%, 0%; sentence shape tested |
| 6 | DRAFTT shows shares that add to at most 100% with therapy and taxes switchable | Pass | Tested; taxes measured against gross |
| 7 | Every advice line has a verdict and a sentence with numbers; early access reads unlearn with a Roth IRA | Pass | Tested on Maya and Dev |
| 8 | No M4 sentence instructs | Pass | Scan test for "you should", "you must", "you need to" |

## What is weaker than it looks

1. The ratios that need the optimizer (True FI gap) or the levels (runway, heirs' share) take a second or two; the screen computes them on demand.
2. The DRAFTT ranges are common guidance written down, not sourced.
3. The lens buttons open one lens at a time; the spec does not say otherwise, but a reader may want two open.
