# Family pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. **Partly built 2026-10-04 as the `dependents` module (beta, decision A9):** dependents as facts with birth month and where they live; the child tax credit, the dependent care credit (unverified, flagged), and head of household by year on the return; a spending row that ends on a child's age; term life from the household's dependents. Not built: the 529 account (needs a new tax bucket, a core change), the dependent care FSA as an optimizer option, the kid block link, the ACA household size from dependents.

---

## 1. The idea in one paragraph

A child changes the return (credits, filing status), the spending (the kid block already prices that), the savings (a 529 is a new bucket with its own rules), and the plan's shape (college years, a dependent's health coverage). The engine has the kid block and the 529-to-Roth strategy listed (M2 spec E5); this pack adds dependents as facts and the 529 as an account.

## 2. Who it is for

Parents, guardians, and anyone planning for a child.

## 3. When it unlocks

A `kid` block exists, or a dependent is entered.

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Dependents: birth month each | New `household.dependents[]` with `birthDate` | Fact | None |
| 529 account: balance, beneficiary, state plan | New account preset `529`, taxBucket `education` (new value) | Fact | None |
| Expected college cost a year and years | Goal bucket (5) with a new `kind: education`, or a block | Goal | National placeholder, roughly, source to find |
| Childcare and the years it runs | Kid block questions (9.5), exist | Goal | Placeholders |

## 5. Engine pieces reused

- `applyBlock` with the kid block for spending.
- The savings waterfall (a 529 step after the Roth IRA when a dependent exists, decision to propose).
- `computeFederalTaxM2` for the credits once added.
- `healthcareLine` with `householdSize` counting dependents for the poverty line (the field exists: `acaHouseholdSize`).

## 6. What is new

| Piece | Status |
|---|---|
| Child tax credit and the dependent care credit on the return, with phase-outs | **New engine capability**: registry rules `fed.childTaxCredit.2026` and `fed.dependentCare.2026`, to verify |
| Head of household as a computed suggestion when a dependent exists and no partner | Small; the status exists |
| A 529 bucket: grows tax free, withdrawals for education are untaxed, the leftover can roll to the beneficiary's Roth under the lifetime cap (E5) | **New engine capability**: bucket, withdrawal rule, and a registry rule for the rollover cap |
| The dependent on the ACA household size and, from 26, off it | Small |

## 7. Acceptance tests

1. A household with one child under 17 pays less federal tax by the credit the registry gives, and none above the phase-out.
2. 529 contributions reduce nothing on the federal return and grow by the account's band; education withdrawals in the college years are untaxed.
3. The kid block plus the 529 together never count the same college dollars twice.

## 8. Not in this version

Custody splits, adult dependents, the state 529 deduction (state tables do not carry it yet), FAFSA and aid.
