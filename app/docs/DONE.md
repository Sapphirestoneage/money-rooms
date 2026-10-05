# Definition of done

A card is done, and its module frozen, when every line holds:

1. **The contract did not change during the build.** The planet's inputs, owned facts, and published outputs match `CONTRACTS.md` as it stood when the card started. A change that was needed is a decision in `DECISIONS.md` and a new card.
2. **All five stations work**: capture, enrich, analyze, recommend, publish.
3. **It handles every input status**: empty, unknown, rough, entered, verified, none, and not applicable. Nothing shows an error; nothing breaks a metric downstream. Waiting metrics name what they need; estimated ones say so.
4. **Tests tie out to the test households.** Household A and Household B (`app/tests/households/`) have expected answers filled in and the tests pass against them. An expected value is never changed to make a test pass without Eli's decision in `DECISIONS.md`.
5. **It reads only from the hub and writes only its own facts**, through the Ledger. The import rules test proves it.
6. **It is consistent with the design system**: tokens only, no hard-coded colors, type, spacing, or radii.
7. **Eli signed off in preview.** The card moves to "Done and frozen" only after that, by Eli.

A frozen module is edited only when a test is failing or `DECISIONS.md` records a decision to reopen it (`CLAUDE.md`).
