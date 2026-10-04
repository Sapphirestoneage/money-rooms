# M3 self-audit scorecard

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 at the end of Phase 3 of the overnight build. Same format as the M2 scorecard: each acceptance test from `docs/m3-spec.md` section 14, the evidence, and a grade (Pass, Partial, Fail).

| # | Test | Grade | Evidence |
|---|---|---|---|
| 1 | A new person reaches a first FI date in under five minutes | Partial | The five required answers each have an "I don't" answer and the guided mode walks them one per step. Not timed with a person |
| 2 | The next card's #1 item is always the highest value per minute under section 6, verified against the three example households | Partial | `engine/flow/flow.test.ts` checks the rule on Maya (highest value per minute among eligible current-level items, small cards below it, later levels only at 3x). Jordan and Dev are not yet asserted |
| 3 | Changing materiality from 5% to 15% removes items from the main path and adds the warning label to every result | Pass | Test: `worthSharpening` at 15% is shorter than at 5%. The What's next screen shows "Calculated at 15% materiality. Results are rougher than usual." above 5%. **The result screen does not yet carry the label**: Partial on that half |
| 4 | A balance left unconfirmed for 12 months appears on the next card if, and only if, it has become material | Partial | Staleness widens a balance to the roughly range at 12 months (tested). The next card does not yet read the widened kind; the Refresh card lists every aged number as the spec says. Wiring the widened range into the materiality engine is the missing step |
| 5 | Small wins shows a correct running total, and promotes itself to the main path when the total crosses the material line | Pass | `smallWinsTotal` tested for the total and promotion; the promotion card appears on the Next tab |
| 6 | Every item card shows value, effort, and why. No card appears without all three | Pass | Every item in `data/items.json` has effort and why; values are computed per item (tested) and the card template always prints all three |
| 7 | Confirming an aged number restarts its clock, shows its next check date, and clears it from the Refresh card | Pass | Tested in `flow.test.ts`; the card shows "due YYYY-MM" and the "since last time" line after a refresh |
| 8 | The Sky zooms from everything, to an area, to a row, and back, and the outline view shows the same hierarchy | Pass | `skyTree`, `findSkyNode`, `skyOutline` tested; the screen zooms by tap or keyboard with a breadcrumb trail and a Zoom out button, and the outline toggle shows the same nodes |
| 9 | Switching entry modes mid-level loses nothing | Pass by construction | Modes only change which sections are shown; every change is saved as it is made (E19). Not tested in a browser |

## What is weaker than it looks

1. The materiality engine runs about two projections per input (about 20 to 30 for Maya, under two seconds). A household with many rows will feel it; the screen shows "Measuring what matters most..." meanwhile.
2. Items beyond Level 1 are placeholders with a 2% value so they can rank; their real values arrive with their levels (Phases 4 and 5).
3. The dump mode is the template paste box; "type everything in any order and the app sorts it" beyond the template format is not built.
4. Guided mode is one section per step, not one question per step.
5. The staleness widening is not yet fed into the materiality ranges (test 4).
