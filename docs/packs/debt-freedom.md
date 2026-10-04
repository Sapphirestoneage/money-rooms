# Debt freedom pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only.

---

## 1. The idea in one paragraph

The engine already does the hard part: debts with promo rates and payment schedules, the high-interest step in the waterfall, three payoff methods compared with their interest and stress-months, and the price of peace (M5). This pack turns that into a room: a debt-free date on the FI timeline, each debt's own month, what an extra $100 a month buys, the refinance and consolidation blocks, and the small wins that free the money.

## 2. Who it is for

Anyone with a debt other than a mortgage, and anyone with a mortgage who wonders about paying it early.

## 3. When it unlocks

A debt exists.

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Stress rating per debt (how much it weighs on you) | Debt account `stress` (M5 payoff uses it; confirm the field is in 3.6) | Decision | Medium |
| Extra a month toward debt | Exists as the payoff screen's input; store as `drawdown.extraDebtMonthly` if it should persist | Decision | 0 |
| A consolidation or refinance offer (rate, term, fee) | Scenario block `refinance` (new type, shared with the Home pack) | Goal | None |
| Student loan plan type (standard, income-driven) and forgiveness date | New `accounts[].studentLoan` with `plan` and `forgivenessDate` | Fact | None |

## 5. Engine pieces reused

- `comparePayoffMethods`, `payoffOrder`, `simulate` (engine/whatifs/payoff.ts).
- `debtYear`, `nominalRateFor`, promo rates (engine/projection/debts.ts).
- The high-interest threshold and step (timeline.ts, decision E11).
- `smallWins` with the debt-related wins; `applyBlock` for the refinance block.
- `ratios.debtToIncome`.

## 6. What is new

| Piece | Status |
|---|---|
| The debt-free date on the FI timeline and each debt's own payoff month | Display over `simulate` |
| "What $100 more buys": months and interest saved per extra $100, from the simulation | Display over `simulate` |
| A refinance block: a new rate, term, and fee replace a debt's terms from a date | Small engine piece (a block op on a debt account) |
| Income-driven student loan payments and forgiveness: payments as a share of discretionary income, the balance forgiven at the date, taxed or not by the rule in force | **New engine capability** and registry rules to verify (the rules changed in 2025 and 2026; the source must be current) |
| Mortgage early payoff versus investing: two runs compared on the FI date and the estate, with the sentence that the mortgage rate is the guaranteed return | Reuses two projections; display is new |

## 7. Acceptance tests

1. The debt-free date equals the last month in the simulation with a balance above zero, plus one.
2. Each extra $100 a month shortens the schedule by the months the simulation gives, never more.
3. A refinance block changes the rate and payment from its date and never before.
4. Paying the mortgage early on Maya-like numbers shows both FI dates; neither is called right.

## 8. Not in this version

Credit scores, negotiation, bankruptcy, debt settlement, balance-transfer hunting (the promo rate field covers an offer in hand).
