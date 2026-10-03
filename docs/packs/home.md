# Home pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only.

---

## 1. The idea in one paragraph

A home is the biggest number in most plans and the engine barely knows it: today it is a mortgage debt and a home block's rough ownership cost. This pack makes the home an asset with its own appreciation band, the mortgage's interest and property tax as real lines, the sale (or not) as a plan event, and rent versus buy as a comparison over the person's own plan rather than a rule of thumb.

## 2. Who it is for

Renters deciding whether to buy, owners with a mortgage, anyone refinancing, downsizing, or moving.

## 3. When it unlocks

A mortgage debt exists, a `home` block has been tried (M5), or the person opens it.

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Home value today | New account preset `home` (3.6), taxBucket `property` (new value), balance | Fact | None, roughly |
| Property tax and insurance a year | Spending rows already carry them (3.5); the pack links them to the home | Fact | From the block's 1.5% placeholder |
| Appreciation band | New assumption `returns.property` (4.1) | Assumption | Low 0%, likely 1%, high 2% real, roughly, source to find |
| Plan to sell? At what age? Where to after? | New `accounts[].sale` with `{ age, netToInvest, nextHousingAnnual }` | Decision | No sale |
| Refinance offer (rate, term, closing costs) | Scenario block `refinance` (new type in 9.5) | Goal | None |

## 5. Engine pieces reused

- `debtYear` and `nominalRateFor` (engine/projection/debts.ts) for the mortgage, including promo rates.
- `applyBlock` for the home, refinance, and move blocks.
- `priceCard` (engine/whatifs/dreams.ts) for a home as a dream.
- `estateView` for the home in the estate.

## 6. What is new

| Piece | Status |
|---|---|
| A `property` tax bucket and a home preset that grows by the property band and never joins the withdrawal order | **New engine capability** (accounts.ts and timeline.ts) |
| A sale event: at the sale age the home leaves the balance sheet, the net proceeds land in taxable with the exclusion applied (rule `fed.homeSaleExclusion`, $250,000 single and $500,000 joint, to verify), and the next housing cost replaces the old rows | **New engine capability** |
| Rent versus buy over the plan: two runs, one with the home block and one without, compared on the FI date and the estate; the "rent is throwing money away" advice line (M4) points here | Reuses two projections; the comparison is new display |
| Mortgage interest and property tax in itemizing, when the Taxes pack adds itemizing | Waits on the Taxes pack |

## 7. Acceptance tests

1. A home that appreciates at the likely band and is never sold adds exactly its grown value to the estate and nothing to withdrawals.
2. A sale at 70 moves the net proceeds to taxable in that year, applies the exclusion, and replaces the housing rows from that year.
3. Rent versus buy on Maya with the national placeholders shows both FI dates and the estate in each; neither is called the winner.

## 8. Not in this version

Rental property income (the `rental` stream type exists as a shape), HELOCs, reverse mortgages, ownership between partners (the owner field covers a joint home).
