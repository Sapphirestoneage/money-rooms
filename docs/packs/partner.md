# Partner pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only. Builds on `docs/household-two-spec.md` (built, Proposed).

---

## 1. The idea in one paragraph

Households of two now run through the engine with both ages, both records, and one return or two. This pack adds what the first version left out: a retirement date per person, the partner's claiming age in the optimizer, how the plan looks if one person stops working first, who the plan is for after one person is gone, and a partner view of every screen so the second person sees their own side.

## 2. Who it is for

Every household with a partner entered.

## 3. When it unlocks

A partner exists (`household.partner`).

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Partner's retirement date | New `partner.retirementAge` or a dated end on each partner stream (3.4 exists) | Decision | The household date (decision H1) |
| Partner's claiming age | `partner.socialSecurity.claimingAge` (4.4), exists | Decision | Full retirement age |
| Partner's earnings record | `partner.socialSecurity.earningsRecord` (4.4), exists | Fact | Estimated |
| How spending changes after one person | New `spending` phase `afterOne` with a factor (4.x phases exist) | Assumption | 0.75 of the couple's spending, roughly, source to find |
| Who keeps what: beneficiary on each account | New `accounts[].beneficiary` | Fact | The partner |

## 5. Engine pieces reused

- Everything in `docs/household-two-spec.md`: per-person streams, limits, FICA, records, spousal and survivor top-ups, owner ages, two returns.
- `optimize` with a new knob, `partnerClaimingAge`, in `knobValues`.
- `shockTests` (Level 2) for "one income stops".
- `estateView` and `legacyFi` (Level 5) for the second person's estate.

## 6. What is new

| Piece | Status |
|---|---|
| Two retirement dates: the FI search finds the earliest date for one person given the other's | **New engine capability** (the search is one-dimensional today) |
| The partner's claiming age as an optimizer knob | Small: one more knob in `engine/optimizer/search.ts` |
| Mortality before plan-to age: a life table per person replaces "the first plan-to age" for the survivor rule | **New engine capability** and a sourced table (SSA period life table, to verify) |
| Spending after one person | A phase factor in the spending function; small |
| A partner view: the result and levels screens with "your side" and "your partner's side" (the row already carries `partner.age`, `partner.income`, `partner.socialSecurity`) | Display only |

## 7. Acceptance tests

1. With one retirement date the pack reproduces the household-two results exactly.
2. With the partner retiring five years later, the household's FI date is never later than with both retiring together.
3. The optimizer's partner claiming knob moves only the partner's benefit.
4. The survivor rule with a life table never pays a survivor benefit before the earlier of the two life expectancies and the plan-to age.

## 8. Not in this version

Divorce, community property states, married filing separately quirks beyond the Roth phase-out, dependents (Family pack).
