# Board

Work-in-progress limit: **2** cards in progress at once. A card moves right only; "Done and frozen" is Eli's move after sign-off in preview (`DONE.md`).

| Not started | In progress | Ready for review | Done and frozen |
|---|---|---|---|
| 2 Sun + Income + Spending + one-pager v0 | | 1 Foundation | |
| 3 Debt | | | |
| 4 Safety Net | | | |
| 5 Investments and Accounts | | | |
| 6 Taxes v1 (federal + FICA) | | | |
| 7 Full one-pager | | | |
| 8 Life Plan and simulator | | | |
| 9 Session path and progress strip | | | |
| 10 Curation v0 | | | |
| 11 Design pass | | | |
| 12 Pilot | | | |

## Cards

1. **Foundation.** The data foundation (`app/core`: statuses, metadata, summary-or-detail, the metrics registry, the assumptions drawer, schema and migration, ledger, hub, sandbox), client files (picker, export and import, snapshots, undo, the commit guard), the household templates, the docs, and tests. *Ready for review, 2026-10-05.*
2. **Sun + Income + Spending + one-pager v0.** The hub with the core facts; the Income and Spending planets through all five stations; a first one-page plan with their outputs and the DRAFTT scorecard rows they feed.
3. **Debt.** Debts with promo rates and stress ratings; payoff order by rate and by stress; debt-free date; freed cash flow by month. Reuses `engine/whatifs/payoff.ts`.
4. **Safety Net.** The Rule of 5 target, runway at full spending, DRAFTT, and FAT; the monthly amount to close the gap. Reuses `engine/levels/resilience.ts`.
5. **Investments and Accounts.** Balances by tax bucket and liquidity tier; annual contributions; remaining room under the legal limits. Reuses `engine/projection/limits.ts`.
6. **Taxes v1 (federal + FICA).** Estimated annual tax, effective and marginal rate, state as an estimate. Reuses `engine/tax/federal.ts`, `state.ts`, `brackets.ts`.
7. **Full one-pager.** Every planet's recommend station on one page, with the DRAFTT scorecard complete.
8. **Life Plan and simulator.** Events and goals with dates and costs; the copy-on-write sandbox with Promote.
9. **Session path and progress strip.** The order a session walks the planets; what is complete, rough, and waiting.
10. **Curation v0.** The Learn leg: curated reading linked from planets and moons.
11. **Design pass.** Tokens, layout, print of the one-pager.
12. **Pilot.** Real sessions with Eli's clients; the pilot's findings as cards.

## Later

- Taxes v2 (ACA premium credits, Roth conversions, dependents' credits).
- Social Security estimate in Life Plan.
- CSV import of a client's numbers.
