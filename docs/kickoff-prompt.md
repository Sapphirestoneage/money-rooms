# Starting M1

## Part 1. Set up the repo

Done by the bootstrap message: Claude Code created these files, initialized git, and pushed to a new GitHub repo.

## Part 2. Paste this into Claude Code

```
We're starting Money Rooms version 2 from scratch in this repo. Read CLAUDE.md
first, then README.md, then everything in docs/. Those documents are the source
of truth. Don't build anything they don't describe.

Our goal is milestone M1, the walking skeleton, as defined in docs/roadmap.md.

Stack: TypeScript, Vite, and Vitest, building to a static site deployed to
GitHub Pages with a GitHub Action. No UI framework for M1. If you think a
different stack is better, tell me why before starting.

Work in this order, and stop after each step to give me a plain-English
summary (what you built, which layer, anything I should confirm):

1. Project setup: Vite, TypeScript, Vitest, the folder structure in README.md,
   and the GitHub Pages deploy. Commit.
2. Data model: TypeScript types for every level-one field in
   docs/data-dictionary.md, including the metadata on every value (asOf,
   source, confidence). Loaders for the JSON files in data/. Commit.
3. Tax tables: create data/tax/2026.json from official IRS and state sources
   for the M1 tax set in docs/engine-spec.md section 5. Cite every source in
   the file. Show me the sources before using them. Commit.
4. Engine: the annual loop in docs/engine-spec.md section 3, one step at a
   time, each with tests. Then the FI date search in three bands. Commit
   after each piece.
5. Household tests: load the three files in tests/households/ and confirm the
   engine runs for each band. Expected values are blank until I fill them in.
6. UI: the entry screen and result screen from docs/roadmap.md, built only from
   the components in docs/design-system.md and the tokens in ui/tokens.css.
7. Export and import as versioned JSON, with a snapshot before import.

Rules that matter most to me:
- The engine never lives in the UI, and the UI never calculates.
- Nothing is stored that can be computed.
- Every number on screen can be traced to its inputs.
- If something in the docs is unclear or contradictory, ask me. Don't guess.
```

## Part 3. While Claude Code works (Eli)

Lesson 4 runs in parallel: build Maya's household in a spreadsheet, one row per year, and compute her likely FI age by hand. That number becomes the first audit tie-out in `tests/households/maya.json`. When the engine matches your spreadsheet, the skeleton is real.
