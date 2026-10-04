# Health pack

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04. Docs only.

---

## 1. The idea in one paragraph

Health care is the cost early retirees fear most and the one the engine prices most roughly: a placeholder benchmark premium, the ACA credit with the 2026 cliff, Medicare with IRMAA, and nothing for a bad year. This pack sources the placeholders, adds the bridges people actually use (COBRA, a partner's plan, a part-time job's plan), a chronic-cost line, long-term care as a late-plan phase, and the HSA as the triple-advantaged account it already is in the engine.

## 2. Who it is for

Anyone retiring before 65, anyone with an ongoing medical cost, anyone within two years of Medicare, anyone with an HSA.

## 3. When it unlocks

Level 2 complete, or a retirement date before 65 in the plan, or an HSA.

## 4. Questions added

| Question | Dictionary home | Kind | Default |
|---|---|---|---|
| Your actual marketplace benchmark premium (from healthcare.gov for your county) | `drawdown.benchmarkPremiumAnnual` (new, replaces the placeholder in `data/healthcare.json` when entered) | Fact | Placeholder, lookUp |
| Expected out-of-pocket a year | `drawdown.outOfPocketAnnual` (new) | Fact | Placeholder, roughly |
| An ongoing medical cost a year, from what age | A spending row with the `health` category and a start (3.5), exists | Fact | None |
| Bridge after leaving work: COBRA months and cost, or a partner's plan | New `resilience.cobraMonths`, `resilience.cobraMonthlyCost` (9.8) | Fact | None |
| Long-term care: plan for it, from what age, for how long, at what cost | New spending phase `longTermCare` (4.x) | Assumption | Off; placeholder cost and years, source to find |
| Medicaid expansion state | `drawdown.medicaidExpansionState` (exists, unknown by default) | Fact | From the state list once sourced |

## 5. Engine pieces reused

- `healthcareLine`, `acaPremiumCredit`, `irmaa`, `magiForPctFpl` (engine/projection/healthcare.ts), per adult since households of two.
- The HSA receipts strategy (A6) and the stealth-IRA rule (C4) in the timeline.
- `healthAfterJobLossMonthly` and `runway` (Level 2).
- The optimizer's `acaTarget` knob and the IRMAA tier cap limit.

## 6. What is new

| Piece | Status |
|---|---|
| Sourced placeholders: the benchmark premium by age band, Part B and D premiums, out-of-pocket | Data work: cms.gov and healthcare.gov are reachable; a verified `data/healthcare.json` replaces the placeholders |
| COBRA as the first months after leaving work, before the marketplace | Small engine piece in the healthcare line and the Level 2 runway |
| Long-term care as a late spending phase with its own cost and years | Small: a phase in `spendingForYear` |
| The ACA age curve: premiums rise with age under the 3:1 rule | Small, with a sourced curve |
| An HSA receipts tracker: the saved receipts total, what it unlocks early, and the "pay from pocket, reimburse later" price | Display over existing fields |

**Needs new engine capability:** partly (COBRA, long-term care phase, age curve are small; the rest exists).

## 7. Acceptance tests

1. A 60-year-old retiree with MAGI at 250% of the poverty line pays the applicable percentage from the registry table and nothing else for the premium.
2. COBRA months come first and the marketplace follows; the runway stack shows both.
3. Long-term care from 85 for three years raises spending in exactly those years.
4. Every health number on the screen names its source and verified date, or says placeholder.

## 8. Not in this version

Disability income beyond the Level 2 gap, dental and vision, Medicare Advantage versus Medigap choice, the Health pack for a dependent.
