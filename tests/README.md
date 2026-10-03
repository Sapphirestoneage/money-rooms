# Tests

Two kinds of tests keep Money Rooms honest.

## Unit tests
Every engine function gets a test with inputs and the exact expected output. Claude Code writes these alongside the code.

## Example households (the audit tie-outs)
Each file in `households/` is a complete person with inputs and expected results. They play the same role as tie-outs in an audit: if the engine changes and a household's answer moves, something needs explaining.

**How expected values get filled in**

1. Eli builds the household in a spreadsheet (inputs tab, assumptions tab, one row per year) and computes the answer by hand.
2. The hand-checked values go into the `expected` block.
3. From then on, every change must reproduce them. A mismatch is reported, never "fixed" by editing the expected value without Eli's approval.

Until a household's `expected` values are filled in, its test checks only that the engine runs and returns a result in each band.

**The households are also the example data** shown in the app ("loud and proud"), so every example a person sees is one that's been checked.
