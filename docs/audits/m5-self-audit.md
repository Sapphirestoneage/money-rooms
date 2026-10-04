# M5 self-audit scorecard

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 at the end of Phase 5. Level 3 acceptance tests 1 to 3 and the roadmap's M5 scope.

| # | Test | Grade | Evidence |
|---|---|---|---|
| L3.1 | Every dream shows cost in time, true amount, and best timing, in that order | Pass | `priceCard` returns the fields in that order (tested); the card renders them as an ordered list with the other side of the trade between the true amount and the timing, as section 3 lists |
| L3.2 | The true amount equals the cost grown at the likely return to the stated age, in today's dollars | Pass | Tested against the formula at the likely blended real return to 65 |
| L3.3 | The timing curve's markers match the plan's actual event dates | Pass | Markers come from the plan's own timeline (debt payoff rows) and milestone dates; tested that a payoff marker lands on its age |
| M5 | Scenario blocks are layered proposed changes, never edits to real rows | Pass | Tested: the household is byte-identical after applying a block |
| M5 | Blocks stack, carry several dates, and can replace one another | Pass | Tested |
| M5 | Goal buckets in the projection with must, want, dream trimming | Pass | Tested: dreams trimmed first, musts kept, "fits from" ages |
| M5 | Payoff methods: avalanche, snowball, peace-first, with the price of peace | Pass | Tested on three debts and on Dev |

## What is weaker than it looks

1. National defaults for blocks are unsourced placeholders (W2).
2. A block's timing comparison uses a browser prompt for the second date; a proper month picker belongs in the design system.
3. Scenario blocks and dreams are not yet "decision rooms" that end in "Add this as a block"; they are added directly.
4. Price cards cost about ten FI searches each (one per age in the window), so a household with many dreams waits a few seconds.
