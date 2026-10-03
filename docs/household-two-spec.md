# Households of two spec

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build, in the format of `m3-spec.md`, then built on branch `household-two`. Decision D18 set the shape (self and partner) on day one; this spec gives the partner logic. Every product decision is logged as Proposed (decisions H1 to H6).

---

## 1. The idea in one paragraph

A household of two is not two households added up. Income is taxed together or apart by filing status, each person has their own age and so their own penalties, catch-ups, required distributions, and Medicare, accounts belong to one person or both, and Social Security has spousal and survivor benefits that depend on both records. The engine already carries a partner in its shape; this spec makes the partner count, one piece at a time, without changing anything for a household of one.

---

## 2. The parts

### 2.1 The partner as a second person

`household.partner` holds the same fields as `self` (birth date, state, income, HSA eligibility, Social Security parts). The state is the household's, read from `self`. Filing status is the household's too (3.2), read from `self`; a married status requires a partner record (the dictionary's validation, now enforced).

### 2.2 Ages, limits, and access per person

Every age-keyed rule reads the owner's age (dictionary 9.4): catch-up contributions, the 10% additional tax and 59 and a half, the HSA catch-up at 55, required distributions and the start age by birth year, the senior deduction at 65, Medicare and IRMAA at 65 (health care before 65 is priced per person not yet on Medicare). A joint account reads the older owner's age for penalties and the younger's for required distributions, which is the conservative reading for each.

### 2.3 Income, deductions, and the earnings records

Both people's streams run in the same year loop. FICA and self-employment tax are computed per person (each has their own wage base). Each person's covered earnings feed their own Social Security record. Workplace contributions and matches belong to the stream's person; the waterfall's per-person limits are enforced per person, and the household's surplus fills each person's accounts in the chosen strategy's order, self first then partner (a later version can split).

### 2.4 Taxes together

Married filing jointly: one return on both incomes with the joint brackets, deduction, and thresholds already in the registry. Married filing separately: two returns, each on the person's own income with the separate columns; the household's tax is the sum. Head of household and single stay as they are. State tax follows the same columns the state tables carry (single or joint).

### 2.5 Social Security for two

| Benefit | Rule | Source |
|---|---|---|
| Own benefit | Each person's PIA from their own record, claimed at their own age | SSA, as today |
| Spousal | Up to 50% of the worker's full-retirement-age benefit (PIA), in place of the claimant's own benefit if larger; the worker must have claimed; reduced on the spousal early-claiming schedule when the claimant claims before their own full retirement age (25/36 of 1% a month for the first 36 months, 5/12 of 1% beyond, to be confirmed); delayed retirement credits never apply | SSA, Benefits for Spouses |
| Survivor | After one dies, the survivor receives the larger of their own benefit and up to 100% of the deceased's benefit, reduced when the survivor's own claiming age is before their full retirement age, as early as 60 (71.5% at 60, to be confirmed) | SSA, Benefits for Survivors |

The engine applies spousal top-ups once both have claimed, and the survivor rule from the year after the plan-to age of the first to reach it. **Known simplification (accepted at review, 2026-10-04):** the survivor rule starts at the first plan-to age because mortality is not modeled yet; the Partner pack's life table replaces it. Both rules live in `data/rules-registry.json` as `ss.spousalAndSurvivor` with separate spousal and survivor schedules (decision H9); **the schedule numbers are entered from memory and stay unverified until Eli confirms them at the SSA URLs, and the engine flags every plan they change**. A married filing status with no partner entered is a flag, not an error (decision H10).

### 2.6 Spending, retirement, and plan-to age

Spending is the household's, as today. Retirement is one date for the household in this version (each person's streams stop at it unless dated otherwise). The horizon runs to the younger person's plan-to age.

### 2.7 Entry

An "Add a partner" button on About you opens the partner's fields (birth month, income, HSA eligibility, Social Security claiming age). Each account gets an owner picker (Self, Partner, Joint) once a partner exists. Removing the partner keeps their rows in an export but asks first.

---

## 3. Data dictionary additions

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `partner` | Person | Same shape as `self` (exists, D18) | None |
| `accounts[].owner` | Fact | `self`, `partner`, `joint` (dictionary 9.4) | `self` |
| `plans[].owner` | Fact | `self`, `partner` | `self` |

No new fields beyond 9.4. Filing status gains its validation: a married status needs a partner.

---

## 4. Acceptance tests

1. A household of one produces exactly the same result with the partner logic in place (every existing test still passes, Maya ties out).
2. Two people filing jointly pay one joint return on both incomes; filing separately, the sum of two single-column returns; the two differ in the direction the brackets imply for unequal incomes.
3. FICA is capped per person: two earners each above the wage base pay two caps, not one.
4. A partner's 401(k) catch-up applies at the partner's age 50, not the self's.
5. A joint brokerage account's gains are taxed on the household return; a partner-owned pretax account's early withdrawal is penalized by the partner's age.
6. Spousal top-up: a partner with no record receives up to half of the self's PIA once both have claimed; a survivor receives the larger benefit after the first plan-to age.
7. The horizon runs to the younger person's plan-to age.
8. Removing the partner returns the household to its one-person result.

---

## 5. Not in this version

Different retirement dates per person (one date for now), mortality before plan-to age, divorce, dependents, community-property states, the married-filing-separately quirks (the Roth phase-out at $10,000 is already in the registry; the rest wait).
