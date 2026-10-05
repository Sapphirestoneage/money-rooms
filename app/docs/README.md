# Money Rooms v1 (the coach edition)

Money Rooms v1 is coach-operated financial planning software. Eli, a financial coach, runs it with clients in sessions. Clients receive a one-page plan, not the app. Self-serve, logins, cloud sync, and client-facing views are later versions. The product is three legs on one shared data model: Measure (every FIRE metric, one-page report), Simulate (life-event timeline in a sandbox), Learn (curated reading). Navigation is a solar system: a Sun of core facts and seven planets: Income, Spending, Debt, Safety Net, Investments and Accounts, Taxes, Life Plan. Moons are subtopics.

## Where things are

| Path | What |
|---|---|
| `app/docs/` | These documents: architecture, data model, contracts, definition of done, the board, the decision log, the parking lot. |
| `app/core/` | The data foundation (statuses, metadata, summary-or-detail inputs, the metrics registry, the assumptions drawer, the schema and migrations, the ledger, the hub, the sandbox) and the client file manager. Pure TypeScript, no DOM. |
| `app/ui/` | The coach's console: the client picker, export and import, snapshots. Reads `app/core`; never calculates. |
| `app/tests/` | Tests for everything in `app/core`, and the two household templates in `app/tests/households/`. |
| `docs/INVENTORY.md` (repo root) | What the existing v2 code offers and which functions v1 reuses. |

## Running it

From the repo root:

```
npm install
npm run app:test       # the v1 tests
npm run app:typecheck  # tsc on /app
npm run app:dev        # the coach console at http://localhost:5174
npm run app:build
```

The existing v2 app and its tests are untouched: `npm test` and `npm run dev` still mean v2.

## Client files

A client is one JSON file in a folder you choose outside the repo. The console exports and imports those files; nothing under `/clients` or named `*.client.json` can be committed (a pre-commit hook refuses it; see `app/docs/DATA_MODEL.md` section 6). Run `npm run prepare` once after cloning to install the hook.

## Reading order for a new session

1. `CLAUDE.md` at the repo root (the rules).
2. `app/docs/BOARD.md` (the current card).
3. `app/docs/ARCHITECTURE.md`, `DATA_MODEL.md`, `CONTRACTS.md` for the card's planet.
4. `app/docs/DECISIONS.md` for anything already settled.
