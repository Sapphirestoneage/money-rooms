# Session report, overnight build of 2026-10-04

Updated after every commit. Read sections 3 and 4 first: they are what needs your OK.

## 1. Phases

| Phase | Status | Branch | Last commit |
|---|---|---|---|
| 0 Prep | Done | `prep-oct4` | cd5e061 |
| 1 M2 engine | Done | `m2-engine` | (see git log) |
| 2 M2 optimizer and results | Done | `m2-optimizer` | (see git log) |
| 3 M3 flow | Done (see weak spots) | `m3-flow` | (see git log) |
| 4 Level content | Done (all three) | `levels` | (see git log) |
| 5 M5 what-ifs | Done | `m5-whatifs` | (see git log) |
| 6 M4 meaning | Done (spec and build) | `m4-meaning` | (see git log) |
| 7 M6 risk | Not started | `m6-risk` | |
| 8 Households of two | Not started | `household-two` | |
| 9 Pack specs | Not started | `packs-specs` | |
| 10 Foundations | Not started | `foundations` | |
| 11 Coaching spec | Not started | `coaching-specs` | |
| 12 Feature register | Not started | `feature-register` | |
| 13 Readiness audit | Not started | `readiness` | |

**Phase 6 in plain English.** `docs/m4-spec.md` written (Proposed), then built: a Meaning screen with the ratio registry (13 ratios from `data/ratios.json`, each with its formula, unlocked by level or on request), five lenses (the 4% rule against the True FI number, Shockingly simple math with its table against the plan's own years, the DRAFTT scorecard with therapy and taxes switchable, hours, taxes), and the Advice Translator (ten lines from `data/advice.json`, each applies, partly, or unlearn with a sentence from the person's numbers). A test scans every M4 sentence for instructing phrases. Self-audit: `docs/audits/m4-self-audit.md` (all eight pass).

**Phase 5 in plain English.** A What-ifs screen. Scenario blocks: pick a kind (home, car, kid, job change, sabbatical, move, side hustle, inheritance, marriage, custom), answer three or four questions (national defaults marked roughly), and the block lays its changes over a copy of your numbers; each block shows its change in monthly cash flow and the FI date moved, can carry several start dates to compare, can be turned off, and can replace another block. Dreams: each gets a price card in the spec's order (cost in time, true amount at 65, the other side of the trade as a question, best timing with a curve and markers from the plan's own events), plus the milestones it moves and ways to lower the price; the plan trims dreams first and wants second when short, and says from what age a trimmed dream fits. Payoff methods: avalanche, snowball, and peace-first side by side with months, interest, stress-months, and the price of peace. Engine in `engine/whatifs/` with 15 tests. Self-audit: `docs/audits/m5-self-audit.md`.

**Phase 4 in plain English.** A Levels screen with three cards. Level 2 Resilience: the Rule of 5 (matches the spec's worked example to the dollar), the spending staircase with must-pays on every step, the graceful path, the runway stack (cash, the ability to cut, unemployment, severance, reachable investments, break glass shown but not counted), health insurance after a job loss through the ACA mechanics, disability and term life, five shock tests with their effect on runway and the FI date, and the zombie-readiness headline. Level 3: the FIRE spectrum on one line (walk-away money, start a business, Coast, Lean, Barista, Slow, FI, Fat; Flex FI "coming soon") with each milestone's condition and what moves it, plus editable settings. Level 5: the estate after heirs' taxes by band and money type, giving and giving forever at the plan's own withdrawal rate, legacy projects with money and hours, Legacy FI and the breathing room, the freedom budget, and the basics checklist. 30 engine tests. Unemployment uses a national placeholder marked unverified (DOL pages unreachable). Self-audit: `docs/audits/levels-self-audit.md`.

**Phase 3 in plain English.** A new screen, What's next, with three tabs. Next: level progress ("You've covered 71% of what matters"), the next card (one big, two small) ranked by value per minute above the trivial and worth-it lines, the Refresh card for aged numbers (confirm restarts the clock, "since last time" after), the Rough numbers card sorted by materiality with a running bar, the small-wins promotion card, and a materiality setting (label above 5%). Small wins: one card at a time (Done, Not for me, Later) with the running total in dollars and months, personalized from the person's spending. The Sky: circles you zoom into by tap or keyboard with a breadcrumb trail, and an outline alternative. The entry screen gained a mode switch: one section at a time, all on one form, or paste everything. Engine: the materiality engine (plausible ranges by kind, sensitivity per input as a smooth dollar measure, the three lines, coverage), staleness clocks, items with computed values, small wins totals, and the Sky model, all in `engine/flow/` with 14 tests. Self-audit: `docs/audits/m3-self-audit.md` (two acceptance tests partial: the result screen does not yet carry the rough-results label, and widened staleness ranges are not yet fed into the ranking).

**Phase 2 in plain English.** The optimizer searches the policy knobs (conversion target, gain harvesting, ACA target, withdrawal order, 72(t), rule of 55, claiming age, contribution type) for one of four objectives, with the optional limits, in about a hundred projections. It returns the best plan, the baseline, and the plan in words ("Ages 40 to 44: Live on taxable savings. Convert about $16,100 a year..."). Year locks are honored and planned around. Strategy toggles report what turning each one off costs in years and dollars; the stress test reruns the plan with the sunsets gone, Social Security at its floor, and the worst band; tripwire flags name the rules the plan leans on. The result screen now has nine sections in a default order that can be rearranged (stored as a display preference), the True FI card (locked until the drawdown inputs are in, then revealed with a count-up unless motion is reduced, with a replay and a share card that hides dollars by default), the plan, the strategies, and the rules behind the plan with links and verified dates. The entry screen gained a Plan details card for the Level 4 inputs. Self-audit: `docs/audits/m2-self-audit.md`.

**Phase 1 in plain English.** The engine now has two modes. `m1` is the tied-out skeleton and does not change. `m2` reads every rule from the registry (and refuses unverified ones), taxes capital gains with cost basis, applies the Roth ordering rules with five-year conversion clocks, prices health care through the ACA credit (with the 2026 cliff) and IRMAA (two-year lookback), takes required distributions and 72(t) payments, honors the rule of 55 and governmental 457(b), sizes Roth conversions and 0% gain harvests under a MAGI budget, keeps part-time income after retirement, and adds the traditional IRA, 457(b), and mega backdoor steps to the waterfall. All of it is driven by a drawdown policy with per-year locks, ready for the optimizer. 25 new M2 tests plus 48 unit tests on the pieces. Engine spec section 10 documents the method; decisions N10 to N17 are Proposed.

**Phase 0 in plain English.** Every rule in the registry was opened at its IRS or CMS source and confirmed, the empty ones were filled (total additions limit, IRA and Roth phase-outs, 457(b), full brackets, capital gains, IRMAA tiers, ACA table, poverty guidelines), and every change is logged in `docs/rules-verification-2026-10.md`. Six dictionary additions are written as section 9 of the data dictionary. An axe audit found contrast failures on both screens in both themes; they are fixed in tokens only, and the audit is in `docs/accessibility-audit-2026-10.md`. Edge-case tests found one real bug (below) and are in `tests/edge-cases.test.ts`.

## 2. Maya tie-out (M1 conventions mode)

After every engine change: FI age 42 for all three strategies, 580 of 580 cells matching in both checkpoint files. Last run: after commit 250e776. Full suite: 37 files, 349 tests, all passing.

## 3. Proposed specs written (review first)

| Spec | Branch | What it covers |
|---|---|---|
| `docs/m4-spec.md` | `m4-meaning` | Ratio registry, metrics by level, lenses (4% rule, Shockingly simple math, DRAFTT, hours, taxes), the Advice Translator, eight acceptance tests |

## 4. Proposed decisions

| # | Where | Decision |
|---|---|---|
| K1 to K6 | `decisions.md` | M4: the ratio registry shape, locking by level, the simple-math table's assumptions, DRAFTT measurement, advice as data, nothing stored |
| W1 to W6 | `decisions.md` | M5: how blocks are applied, the questionnaire defaults, the headline measure, goal trimming, the true amount and timing curve, the payoff simulation |
| R7 to R10, G6, Y6 | `decisions.md` | Levels: the staircase's category mapping, the unemployment placeholder, health insurance after a job loss, how shocks are applied, how each milestone condition is rendered, the plan's own withdrawal rate for giving forever |
| L12 to L17 | `decisions.md` | M3: the FI number as the materiality measure and the two-projection sensitivity method, impact-weighted coverage and what passes a level, placeholder values for required and later items, small wins stored on the household (dictionary 9.7), entry mode and materiality as display preferences, the Sky's drawing rule |
| N18 to N23 | `decisions.md` | Optimizer: coordinate search with a pair sweep, fixed retirement year for the other objectives, toggle effects measured at a fixed year, the knob set, the result screen's default order, and the True FI definition |
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
| State unemployment benefit table | dol.gov and oui.doleta.gov unreachable; national placeholder in `data/resilience.json` | https://oui.doleta.gov/unemploy/statelaws.asp |
| Medicaid expansion state list | medicaid.gov unreachable | https://www.medicaid.gov/medicaid/program-information/medicaid-and-chip-eligibility-levels/index.html |

No page fetched during this session contained instructions aimed at the build.

## 7. Self-audit scorecards

**M4** (`docs/audits/m4-self-audit.md`): all eight acceptance tests pass.

**M5** (`docs/audits/m5-self-audit.md`): all seven items pass; weak spots are unsourced block defaults and a browser prompt for the second timing.

**Levels** (`docs/audits/levels-self-audit.md`): Level 2 five of six pass (the unemployment state table is a placeholder); Level 3 milestones two of three pass (no hand-computed household yet); Level 5 four of six pass (no hand-checked estate; Hamilton theming not built).

**M3** (`docs/audits/m3-self-audit.md`): tests 5, 6, 7, 8 pass; 1, 2, 3, 4 partial (not timed with a person; only Maya asserted for the ranking rule; the result screen lacks the rough-results label; staleness widening not yet wired into the ranking); 9 passes by construction.

**M2** (`docs/audits/m2-self-audit.md`): acceptance tests 2 to 6 pass; test 1 is partial because the hand-checked Gross and Net FI values for the three households do not exist yet (only you can produce them). Weak spots named: health care placeholders, state tax on retirement income, the 72(t) annuitization approximation, the coordinate search, and no M2 workpaper yet. A suggested second Maya workpaper at M2 depth is described.

## 8. Feature register

Not started.

## 9. Readiness audit top ten

Not started.

## 10. Handoff

**Where I am:** Phases 0 to 6 complete and pushed. **Next:** branch `m6-risk` from `m4-meaning`, write `docs/m6-spec.md` (Proposed) for sequence-of-returns risk via historical backtests on a sourced long-run return series, guardrails spending, and Flex FI, then build it.

**Edge-case verdicts (Phase 0d).** Sensible: no income with savings (date is now), no income and no savings (never funded, shortfall named from the first year), only debt (card paid off, high-interest step fires), age 16 (80-year horizon), spending above income (never funded, gap negative every year), 0% promo ending next month (one month of interest in the stub year, full rate after), all-dontknow import (reads clean, lists every unknown, household stays incomplete so no date shows). Confusing: age 70 still working showed a $0 Social Security benefit in the retire-now case (fixed, commit 250e776); and a person over 73 with a pretax balance sees no required distributions in M1 (expected, M2 strategy B5). Age 100 gives an empty timeline rather than a message; the entry screen's validation (16 to 100) should stop it first.
