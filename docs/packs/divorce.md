# Divorce and support pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 (answers batch, Part 3). Spec and data model this round; nothing built beyond the income types and spending categories in dictionary 9.17.

---

## 1. The idea in one paragraph

A separation changes the return (filing status, who claims the child), the income (support received or paid, with end dates), the spending (legal costs that are nobody's choice, two households for a while), and the balance sheet (accounts split by agreement or order). The engine already runs dated income and spending rows and head of household; this pack adds support as income and expense types, legal costs tagged unavoidable, and a scenario block that splits the accounts, so the plan can be seen before and after without the person doing the arithmetic in a hard month.

## 2. Who it is for

Anyone separating or recently separated, paying or receiving support, or planning around a settlement.

## 3. When it unlocks

A `childSupport` or `alimony` income row, a `childSupportPaid`, `alimonyPaid`, or `legal` spending row, or a `divorce` block.

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Child support received or paid, monthly, until when | Income type `childSupport` (9.17) with `end`; spending category `childSupportPaid` with `end` | Fact | None |
| Alimony received or paid, monthly, until when, agreement date | Income type `alimony` with `end`; spending category `alimonyPaid` with `end`; `agreementBefore2019` on the row (Later: agreements before 2019 are taxable to the recipient and deductible to the payer) | Fact | After 2018 |
| Legal costs, total or monthly, until when | Spending category `legal`, `why: unavoidable` | Fact | None |
| Who claims the child | `dependents[].claimedBy` (self, other parent, alternating) (Later) | Fact | Self |
| The split: which accounts go to whom, the date, a transfer between retirement accounts (QDRO) | Scenario block `divorce`: `{ date, accounts: [{ id, sharePercentToSelf }], qdro: boolean }` | Goal | None |

## 5. Engine pieces reused

- Dated income and spending rows (`periodShare`, `endReached`), including a dependent's age.
- The filing status per year (9.14): head of household while a qualifying child lives with the person, single after.
- `applyBlock` for the split; `estateView` and the net worth chart after it.
- The dependents' credits (9.14), given who claims the child.

## 6. What is new

| Piece | Status |
|---|---|
| Support as income and expense with end dates, untaxed and undeductible for agreements after 2018 | **Built** (income types and categories, dictionary 9.17); the pre-2019 treatment is Later |
| Legal costs tagged unavoidable so the Rough numbers card and the small wins never ask about them | **Built** (the `legal` category's default `why`); the card logic that reads `why` is Later |
| A `divorce` block that moves balances between two households on a date, with a QDRO flag so a retirement split is not a withdrawal | **New engine capability** (a block op on accounts) |
| Who claims the child, alternating years | **New engine capability** (the credits read `claimedBy` by year) |
| A "two households" spending preset for the first year | Content |

## 7. Acceptance tests

1. Support received adds to cash and never to AGI; support paid reduces the gap and never the return.
2. A `divorce` block halves a named account on its date and leaves every other balance untouched; with `qdro` true, the half that leaves a retirement account is not a withdrawal and owes no tax or penalty.
3. Head of household holds while the person claims a qualifying child living with them, and ends the year that stops.
4. Legal costs never appear on the small wins or the Rough numbers card.

## 8. Not in this version

Property division of the home, custody schedules, state support formulas, the pre-2019 alimony treatment, and anything that reads like legal advice: the pack prices what the person enters, nothing more.

## 9. Kindness rules for this pack

- Never a "cost of divorce" headline. The number appears where the person asks for it, as a comparison they built.
- The hard season setting (dictionary 9.18) is suggested, not switched on, when a `legal` row or a `divorce` block appears.
- No nudge toward the optimizer, the True FI reveal, or the FIRE spectrum while the block is new.
