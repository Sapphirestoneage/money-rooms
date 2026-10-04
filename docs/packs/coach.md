# Coach pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only. Waits on the audience decision in the roadmap's parking lot ("Coach mode and client view: after the audience decision is revisited"). See also `docs/coaching-spec.md` (Phase 11) for how the app itself coaches.

---

## 1. The idea in one paragraph

Some people work through their numbers with another person: a financial coach, a friend who is good at this, a partner's parent. The data stays in the person's browser (trust page promise), so the pack cannot be a shared account. It is a read-only view the person creates on purpose, a way for the other person to leave notes that never change a number, and a second export that carries the plan without the personal identifiers the coach does not need.

## 2. Who it is for

A person working with a coach, and a coach with several clients, each of whom owns their own data.

## 3. When it unlocks

Switched on by the person in settings. Never by default, never suggested by the next card.

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Share with a coach: what to include (numbers, kinds, the plan, the levels) | New `sharing` record, not part of the plan: `{ include: [...], createdAt }` | Decision | Off |
| Coach notes per item (a sentence attached to a row id, dated, signed with a name the person types) | New `notes[]` with `{ rowId, text, by, at }` | Record | None |
| Coaching goals (three sentences the two of them agree on, with a review date) | New `coaching.goals[]` with a `reviewOn` date | Decision | None |

Nothing here is a financial fact. Notes and goals are records; they feed nothing in the engine.

## 5. Engine pieces reused

- The export and import (`exportToJson`, `importFromJson`, engine/model/transfer.ts) with an `include` filter.
- `materialityReport`, `nextCard`, `levelsPassed` for the coach's view of what is left.
- `traceFor` so a coach can trace any number the person sees.

## 6. What is new

| Piece | Status |
|---|---|
| A view-only mode: the same screens with every field locked and a banner naming whose plan it is and when it was exported | Display; a mode flag in the store |
| A coach export: the household minus names and the ssa.gov record detail, plus the computed results as of the export, in the envelope with a `shared: true` mark | Small in transfer.ts; the shape goes in `docs/import-template.md` |
| Notes and goals on rows, shown beside the row and in a Notes tab; nothing computed from them | Store and display |
| For a coach: a local list of imported client plans, each its own key in the browser, with the same no-server promise | Store; **the audience decision decides whether this exists at all** |
| A "what changed since the coach saw it" diff: values that moved since the export date, from the as-of dates already on every value | Display over the staleness clocks |

**Needs new engine capability:** No engine math. It needs a product decision (audience) and a privacy review: a shared export leaves the browser by the person's hand, and the trust page must say so.

## 7. Acceptance tests

1. View-only mode cannot change a stored value (every input disabled; the store's save is a no-op in that mode).
2. The coach export contains no name, no email, no birth day (month and year only, as the plan already stores), and no earnings record rows.
3. A note never appears in any engine input or output.
4. The pack is off for a fresh household and nothing on the next card mentions it.

## 8. Not in this version

Accounts, logins, sync, messaging, payments, any server. Those are a different product and a different trust page.
