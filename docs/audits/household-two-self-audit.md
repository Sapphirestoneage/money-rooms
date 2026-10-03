# Households of two self-audit scorecard

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 at the end of Phase 8. Acceptance tests from `docs/household-two-spec.md` section 4. Tests live in `tests/household-two.test.ts`.

| # | Test | Grade | Evidence |
|---|---|---|---|
| 1 | A household of one is unchanged | Pass | All 503 earlier tests pass; Maya ties out (FI age 42 on all three strategies, both workpapers match); the one-person result is identical with the partner logic in place under m1 and m2 |
| 2 | Joint is one return on both incomes; separate is two returns; they differ as the brackets imply | Pass | The 2027 row equals `computeFederalTax` on the joint return, and the sum of two separate-column returns; joint is cheaper for 150,000 and 40,000 |
| 3 | FICA is capped per person | Pass | Two 250,000 earners pay two caps; the difference from one 500,000 earner is the second cap less the single filer's extra additional Medicare tax |
| 4 | The partner's catch-up applies at the partner's age 50 | Pass | A 30% election on about 100,000 is capped at the base limit for a 40-year-old partner and allowed at 50; it lands in a partner-owned 401(k) |
| 5 | Partner-owned pretax draws are penalized by the partner's age; a joint brokerage is taxed on the household return | Pass | Self 62, partner 50: the partner's account owes the 10% tax, the self's does not; the joint brokerage realizes gains with no penalty |
| 6 | Spousal top-up and survivor benefit | Pass, unverified rule | A partner with no record receives half the self's PIA once both have claimed, then the self's full benefit the year after the self's plan-to age; the result flags the unverified rule and lists it with a blank verified date |
| 7 | The horizon runs to the younger person's plan-to age | Pass | The last row is the partner's 95 |
| 8 | Removing the partner returns the one-person result | Pass | Rows and estate are deep-equal under both conventions |

## What is weaker than it looks

1. **The spousal and survivor rule is unverified.** The numbers follow the registry entry typed from memory (50% spousal at full retirement age, reduced by the claimant's own factor; 100% survivor; survivor takes the larger). The real spousal reduction schedule differs from the retirement one, delayed credits do not apply to spousal benefits, and survivor benefits have their own reduction. All of it waits on ssa.gov.
2. **Mortality is the plan-to age.** The survivor rule starts the year after the first person's plan-to age, which is the simplest honest assumption; a mortality table would change every couple's late years.
3. **Married filing separately is approximate.** Withdrawals, gains, and conversions all land on the self's return (decision H2), and the separate-filing quirks (no Roth contribution above a tiny phase-out, no credits) are not applied.
4. **The waterfall fills the partner's workplace plan only** (decision H5). Their HSA and IRA get what is entered, nothing more, so a "max tax savings now" household of two under-saves relative to the real limits.
5. **One retirement date** (decision H1). A Barista FI partner can be modeled with a dated end on their stream, not with a second retirement date.
6. **The optimizer does not search the partner's claiming age** (decision H4), and the result screen does not yet show the partner's side (the row carries `partner.age`, `partner.income`, `partner.socialSecurity` for it).
7. **Health care before 65 prices the marketplace benchmark per adult under 65**, with the poverty line at the entered household size (default 2 with a partner). The Medicaid and cliff flags are evaluated once for the household.
