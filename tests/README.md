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

## The example file format

Each file in `households/` uses a short entry format: plain numbers, `"end": "retirement"` or `"age:30"`, debt payments per month. The loader `householdFromExample` (in `engine/model/examples.ts`) turns a file into a stored household with metadata on every value, and converts a 401(k) dollar amount into a percent of pay. The same loader feeds the examples offered in the app.

## Workpapers and the tie-out tools

| Path | What it is |
|---|---|
| `workpapers/maya-checkpoints.csv`, `workpapers/maya-checkpoints-taxfree.csv` | Eli's hand-calculated rows for Maya: 20 years, 29 columns each |
| `tie-out-conventions.md` | The method the workpaper and the engine agree on, item by item |
| `tie-out/maya-tie-out.ts` | The test-only settings, the mapping from engine output to workpaper columns, and the tolerance |
| `tie-out/compare-maya.ts` | Prints the comparison: `npm run tie-out:compare` |
| `tie-out/print-maya.ts` | Prints Maya under the app's own defaults: `npm run tie-out` |
| `households.test.ts` | Runs every household in every band, and Maya against both workpaper files |
| `ui-rules.test.ts` | Fails if any UI file defines a color outside `ui/tokens.css` |

## M2 tie-out (added 2026-10-04)

`tests/m2-tie-out-conventions.md` adds to the M1 conventions; `tests/workpapers/maya-m2-planA.csv` and `maya-m2-planB.csv` are Eli's hand-calculated rows; `npm run tie-out:m2` prints the comparison; `tests/m2-tie-out.test.ts` asserts it. The reconciliation log, with the engine fixes it found and the workpaper issues for review, is `docs/audits/m2-tie-out-reconciliation.md`.
