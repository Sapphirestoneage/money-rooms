# The complexity budget

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 (answers batch, Part 2). Decision A6. Enforced by `tests/complexity-budget.test.ts`, which fails the build when a rule is broken.

---

## 1. Why a budget

Every module adds a little. Without a line, the sum is a crowded screen, a long first session, and a next card nobody reads. The budget fixes five lines and makes a new module pay for what it adds.

## 2. The rules

| # | Rule | What the test checks |
|---|---|---|
| 1 | **Level 1 asks at most 5 required questions.** | `missingLevelOneAnswers(emptyHousehold())` has at most 5 entries, and the Level 1 required items in `data/items.json` number at most 5. Today: birth date, state, income, spending, accounts. |
| 2 | **No screen is more than 3 taps from home.** Home is Your numbers. A top-bar screen is 1 tap from anywhere; a child screen is one more than its parent. | Every route in `ui/routes.ts` plus every module screen from the registry has `tapsFromHome` of 3 or less, and every `#/` link in the UI's source points at a route in that table. |
| 3 | **At most one new concept per screen.** A module teaches at most one new idea on each screen it touches. | For each module and each screen, `adds.concepts` has at most one entry. |
| 4 | **At most 3 cards shown at once per level.** The next card shows at most 3 items (one big, two small). On any one screen, a level shows at most 3 cards, counting the core's and every active module's. | `materiality.nextCard.smallCards + 1` is at most 3; for each level and each screen, the cards in the core's manifest plus every module's (flag `on` or `beta`) number at most 3. |
| 5 | **A new module fits the budget or names what it replaces.** | A module whose cards would take a level past 3 lists in `replaces` a card of that level it stands in for; the test fails otherwise. |

## 3. What counts as a card

A card is one bordered section a person can read on its own: a `section.card` on the Levels screen, one item on the next card. A collapsed `details` block of inputs under a card is part of that card. Tabs are screens, not cards.

## 4. Where the budget stands (2026-10-04)

| Rule | Standing |
|---|---|
| 1 | 5 required questions. Full. Any new Level 1 question replaces one. |
| 2 | Deepest route: `#/m/debt-freedom` at 2 taps (Levels, then the room); `#/privacy` at 2. The messy-financials modules add no route. |
| 3 | Core: one concept per screen. Small wins: one. Debt freedom: one on Levels (the debt-free date), one in the room (the price of peace). |
| 4 | Level 1 on What's next: the next card, the small-wins promotion, and the hard-season card, 3 of 3 (full). Level 1 on Privacy: the safety card, 1 of 3. Level 2 on Levels: Resilience and Debt freedom, 2 of 3. Level 3 on Levels: 1 of 3; on What-ifs: the lump-sum card, 1 of 3. Level 4: 1 of 3. Level 5: 1 of 3. |
| 5 | No module replaces anything yet. |

## 5. Open questions for Eli

1. Should the result screen's ten sections count under rule 4? They are rearrangeable and the person sees them all; today they are counted as one card (the True FI card, Level 4), because the screen is core and the rule is about what modules add.
2. Rule 2 counts the top bar as one tap from anywhere. On a phone the top bar wraps to two rows; if it ever becomes a menu, every top-bar screen becomes 2 taps and the budget tightens by one everywhere.
