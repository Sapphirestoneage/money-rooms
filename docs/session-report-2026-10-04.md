# Session report, overnight build of 2026-10-04

Updated after every commit. Read sections 3 and 4 first: they are what needs your OK.

## 1. Phases

| Phase | Status | Branch | Last commit |
|---|---|---|---|
| 0 Prep | Done | `prep-oct4` | cd5e061 |
| 1 M2 engine | Done | `m2-engine` | (see git log) |
| 2 M2 optimizer and results | Not started | `m2-optimizer` | |
| 3 M3 flow | Not started | `m3-flow` | |
| 4 Level content | Not started | `levels` | |
| 5 M5 what-ifs | Not started | `m5-whatifs` | |
| 6 M4 meaning | Not started | `m4-meaning` | |
| 7 M6 risk | Not started | `m6-risk` | |
| 8 Households of two | Not started | `household-two` | |
| 9 Pack specs | Not started | `packs-specs` | |
| 10 Foundations | Not started | `foundations` | |
| 11 Coaching spec | Not started | `coaching-specs` | |
| 12 Feature register | Not started | `feature-register` | |
| 13 Readiness audit | Not started | `readiness` | |

**Phase 1 in plain English.** The engine now has two modes. `m1` is the tied-out skeleton and does not change. `m2` reads every rule from the registry (and refuses unverified ones), taxes capital gains with cost basis, applies the Roth ordering rules with five-year conversion clocks, prices health care through the ACA credit (with the 2026 cliff) and IRMAA (two-year lookback), takes required distributions and 72(t) payments, honors the rule of 55 and governmental 457(b), sizes Roth conversions and 0% gain harvests under a MAGI budget, keeps part-time income after retirement, and adds the traditional IRA, 457(b), and mega backdoor steps to the waterfall. All of it is driven by a drawdown policy with per-year locks, ready for the optimizer. 25 new M2 tests plus 48 unit tests on the pieces. Engine spec section 10 documents the method; decisions N10 to N17 are Proposed.

**Phase 0 in plain English.** Every rule in the registry was opened at its IRS or CMS source and confirmed, the empty ones were filled (total additions limit, IRA and Roth phase-outs, 457(b), full brackets, capital gains, IRMAA tiers, ACA table, poverty guidelines), and every change is logged in `docs/rules-verification-2026-10.md`. Six dictionary additions are written as section 9 of the data dictionary. An axe audit found contrast failures on both screens in both themes; they are fixed in tokens only, and the audit is in `docs/accessibility-audit-2026-10.md`. Edge-case tests found one real bug (below) and are in `tests/edge-cases.test.ts`.

## 2. Maya tie-out (M1 conventions mode)

After every engine change: FI age 42 for all three strategies, 580 of 580 cells matching in both checkpoint files. Last run: after commit 250e776. Full suite: 37 files, 349 tests, all passing.

## 3. Proposed specs written (review first)

None yet (Phase 0 wrote dictionary additions, not a spec).

## 4. Proposed decisions

| # | Where | Decision |
|---|---|---|
| N10 to N17 | `decisions.md` | M2 engine: the m1/m2 switch, level-two defaults (70% basis, 50% Roth basis, first Roth year five years back), no HSA draws before 65 beyond receipts, 72(t) annuitization approximated, conversions sized after sales, health care placeholders, Barista income under m2, RMD surplus to taxable |
| X1 to X6 | `decisions.md` | Workplace plan entity, business entity, account owner, scenario blocks as layered changes, contribution-to-plan links, Roth conversion records (dictionary section 9) |
| (engine) | commit 250e776 | The Social Security earnings record is back-filled from this year's entered income even when the FI search tests stopping work this year. Before, anyone who could retire now was shown a $0 benefit. Two-way; Maya unaffected |
| (design) | `tokens.css` | Dark theme uses lighter brand 700 and brand 500, so the likely band line and quiet buttons look different in dark than before. Two-way |

## 5. Questions for you

1. Senior deduction: the 6% phase-out rate comes from the statute, not the IRS page. Confirm it (OBBBA section 70103).
2. RMD ages: 72 for births through 1950 and 75 for 1960 or later come from SECURE 2.0 section 107, not restated on the IRS page. Confirm.
3. Poverty guidelines: which year's guidelines apply to 2026 premium credits (usually the prior year's, published in January), and the Alaska and Hawaii figures. HHS blocks this session.
4. Wage base $184,500: confirm on the SSA fact sheet (ssa.gov blocks this session).
5. The dictionary's workplace plan entity moves the employer match from the income stream to the plan (9.2). Is that the right home, or should the stream keep it?
6. The engine's default policy under m2 draws in the conventional order with no strategies, so the app's headline date now includes Roth earnings penalties, capital gains tax, and marketplace premiums. Maya's app-default likely date moved from 40 (m1) to 41 (m2). Is that the right default, or should the optimizer's best plan be the headline?
7. `data/healthcare.json` placeholders: benchmark silver premium $7,200 a year, Part D $480, supplement and out of pocket $1,200. All marked lookUp. Open question O3 still needs a source.
8. Accessibility judgment calls 1 to 5 in `docs/accessibility-audit-2026-10.md`: the preset picker's list roles, chart label contrast, and the darker theme's new brand shades.

## 6. Skipped or unverified

| Item | Why | URL for you |
|---|---|---|
| `ss.wageBase.2026` lastVerified | ssa.gov blocked | https://www.ssa.gov/cola/factsheets/2026.html |
| Poverty guidelines, Alaska and Hawaii | hhs.gov blocked | https://aspe.hhs.gov/topical-subjects/poverty-economic-mobility/poverty-guidelines |
| SSA POMS IRMAA as a second source | ssa.gov blocked | https://secure.ssa.gov/poms.nsf/lnx/0601101020 |
| Medicaid expansion state list | medicaid.gov unreachable | https://www.medicaid.gov/medicaid/program-information/medicaid-and-chip-eligibility-levels/index.html |

No page fetched during this session contained instructions aimed at the build.

## 7. Self-audit scorecards

None yet.

## 8. Feature register

Not started.

## 9. Readiness audit top ten

Not started.

## 10. Handoff

**Where I am:** Phases 0 and 1 complete and pushed. **Next:** branch `m2-optimizer` from `m2-engine` and build the policy-knob search (coordinate descent over the knobs, objective on the likely band), the plan text, FI number vs True FI number, strategy toggles, the stress test, then the results screen and the True FI reveal.

**Edge-case verdicts (Phase 0d).** Sensible: no income with savings (date is now), no income and no savings (never funded, shortfall named from the first year), only debt (card paid off, high-interest step fires), age 16 (80-year horizon), spending above income (never funded, gap negative every year), 0% promo ending next month (one month of interest in the stub year, full rate after), all-dontknow import (reads clean, lists every unknown, household stays incomplete so no date shows). Confusing: age 70 still working showed a $0 Social Security benefit in the retire-now case (fixed, commit 250e776); and a person over 73 with a pretax balance sees no required distributions in M1 (expected, M2 strategy B5). Age 100 gives an empty timeline rather than a message; the entry screen's validation (16 to 100) should stop it first.
