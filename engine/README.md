# Engine

The projection. Pure functions only: data in, results out.

- No DOM, no styling, no storage calls.
- No numbers that belong in `data/` (rates, limits, presets).
- Every function has a test.

The full spec is in [`docs/engine-spec.md`](../docs/engine-spec.md). The small method choices are in [`docs/m1-conventions.md`](../docs/m1-conventions.md).

## What lives where

| Folder | What it holds |
|---|---|
| `model/` | The data model in code. `types.ts` mirrors the data dictionary. `values.ts` builds values with their metadata. Loaders read and validate `data/`: presets, spending categories, assumption sets, life phases, tax tables, Social Security parameters. `examples.ts` loads an example household file. `transfer.ts` exports, imports, and migrates a household. |
| `tax/` | Bracket math, federal tax (income tax, FICA, self-employment tax, the early withdrawal penalty), and state tax. |
| `social-security/` | The benefit estimate: average indexed earnings, the bend-point formula, the claiming factor. |
| `projection/` | The year loop (`timeline.ts`), its pieces (income, spending, debts, account growth, limits, bands), the FI date search (`fi.ts`), the trace (`trace.ts`), and display conversions the UI may not do itself (`display.ts`). |

The UI imports everything from `engine/index.ts`.
