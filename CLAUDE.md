# Instructions for Claude Code

Read this file at the start of every session. It overrides habits from other projects.

## Who you're working with

Eli is the product owner. He has an accounting and audit background and is learning software architecture as this project goes. He reviews work the way an auditor reviews workpapers: does every number tie out, and can it be traced. He is not reviewing syntax.

## Before writing code

1. Read `README.md`, then the docs relevant to the task. The data dictionary and engine spec are the source of truth.
2. If the task needs a field, rule, or behavior that isn't in the docs, **stop and ask**. Don't invent fields. Propose the addition to the dictionary first.
3. Check `docs/roadmap.md`. Only build what belongs to the current milestone.

## Architecture rules (non-negotiable)

- `engine/` contains pure functions only: data in, results out. No DOM, no styling, no storage calls.
- `ui/` never performs financial calculations. Display formatting (abbreviating, parsing typed amounts, rounding for display) and chart layout math are allowed. If a screen needs a financial number, the engine provides it.
- Every stored value lives in one place. Never duplicate a fact into a second store.
- Store parts, compute totals. Never persist a value the engine can derive.
- All engine math is in real (today's) dollars. Nominal conversion happens only at display time.
- Every value carries metadata per the data dictionary: as-of date, source, and confidence.
- Colors, type, spacing, and radii come only from `ui/tokens.css`. No hard-coded colors anywhere else.
- Field values that aren't code (presets, assumption sets, tax tables) live in `data/` as JSON, never inline in engine code.

## Testing

- Every engine function gets a test.
- The example households in `tests/households/` are the audit tie-outs. When their expected values are filled in, they must pass before any commit.
- When a test fails, report it plainly. Never change an expected value to make a test pass without Eli's approval.

## Commits and reporting

- One logical change per commit, message in plain English ("Add income streams to the data model").
- At the end of every session, write a short summary for Eli:
  - What you built, in plain English.
  - Which layer(s) it touched.
  - Anything you assumed that he should confirm.
  - Anything that's now out of sync with the docs.

## Writing in the UI

Follow `docs/style-guide.md`. Never use em dashes in any user-facing text or in docs. Use commas, parentheses, or hyphens.

## Working in /app (Money Rooms v1, the coach edition)

The folder `/app` is the coach-operated v1, separate from the v2 code at the repo root. These rules apply to every session that touches it, on top of everything above.

1. Read this file and every document in `/app/docs` first (`README.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `CONTRACTS.md`, `DONE.md`, `BOARD.md`, `DECISIONS.md`, `PARKING_LOT.md`).
2. Never store client data in the repo. Nothing under `/clients` and nothing matching `*.client.json` is committed; the pre-commit hook refuses it. Test households are fictional templates.
3. Never import another planet's internals. A planet reads published outputs from the hub and writes only its own facts, through the Ledger.
4. Never edit a module marked frozen unless a test is failing or `/app/docs/DECISIONS.md` records a decision to reopen it.
5. Stay on the current card in `/app/docs/BOARD.md` (work-in-progress limit 2). Put new ideas in `/app/docs/PARKING_LOT.md`, not in the code.
6. Batch questions for Eli at the end of the session, never mid-task.
7. Update `/app/docs/BOARD.md` and `/app/docs/DECISIONS.md` at the end of every session.
