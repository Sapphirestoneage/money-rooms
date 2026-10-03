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
| 7 M6 risk | Done, with the series unverified | `m6-risk` | (see git log) |
| 8 Households of two | Done, with the spousal rule unverified | `household-two` | (see git log) |
| 9 Pack specs | Done (docs only) | `packs-specs` | (see git log) |
| 10 Foundations | Done (CI gate left for review) | `foundations` | (see git log) |
| 11 Coaching spec | Done (docs only) | `coaching-specs` | (see git log) |
| 12 Feature register | Done (docs only) | `feature-register` | (see git log) |
| 13 Readiness audit | Done (docs only) | `readiness` | (see git log) |

**The phases in plain English** (each has a self-audit or spec with the detail).

- **13 Readiness.** `docs/readiness.md` grades Math, Data, Trust and legal, Users, Upkeep, and Launch as Ready, Partial, or Missing with evidence, eight attorney questions (no conclusions), and the top ten moves (section 9).
- **12 Feature register.** v1 cloned and inventoried room by room; every feature scored on the rubric, ranked, planned or iced (section 8). The luxury-strategies catalog is not in v1; the four corrections are recorded and seventeen other v1 claims fail against the registry.
- **11 Coaching.** `docs/coaching-spec.md`: the weekly loop in twelve parts (rings, an openable readiness score, four programs, re-planning, records, phases, the Sunday recap, rest days, tag insights, coach mode through exports only, lessons, streaks with freezes) and what will not be copied. Nothing built.
- **10 Foundations.** The Pages deploy gated on types, tests, and the tie-out (left on `foundations` for review); a backup nudge after 30 days; progress history built from `docs/history-spec.md` with a trend sentence on the result screen; About and Privacy pages with a footer and a delete button; three specs not built (statement upload, rules routine, performance budget).
- **9 Packs.** Ten pack specs in `docs/packs/` with an index flagging which need new engine capability (Earn more and Debt freedom need none).
- **8 Households of two.** `docs/household-two-spec.md` written, then built: both incomes in the loop with per-person ages, limits, FICA caps, records, and claiming; one joint return or two separate ones; account owners decide penalties and distributions; health care per adult; spousal and survivor benefits on an unverified SSA rule, flagged; "Add a partner" and owner pickers on the entry screen. Nine tests; the 503 earlier tests and Maya unchanged.
- **7 Risk.** `docs/m6-spec.md`, then backtests from every start year, the sturdy FI date, guardrails, and Flex FI on a Risk screen. **The return series is typed from memory and unverified**; every result says so.
- **6 Meaning.** `docs/m4-spec.md`, then the ratio registry (13 ratios), five lenses, and the Advice Translator (ten lines), with a test that scans every sentence for instructing phrases.
- **5 What-ifs.** Scenario blocks with national defaults, dream price cards in the spec's order, and three payoff methods side by side with the price of peace.
- **4 Levels.** Level 2 (Rule of 5, staircase, runway stack, shocks, zombie readiness), Level 3 (the FIRE spectrum), Level 5 (estate, giving, legacy FI, the freedom budget, the basics).
- **3 Flow.** The What's next screen: level progress, the next card by value per minute, Refresh and Rough numbers cards, small wins, the Sky; three entry modes.
- **2 Optimizer.** Coordinate search over the policy knobs for four objectives with limits and year locks; the plan in words; toggles, the stress test, tripwires; the True FI reveal and a rearrangeable result screen.
- **1 M2 engine.** A second conventions mode (`m2`) that reads every rule from the registry and refuses unverified ones: gains with basis, Roth ordering with five-year clocks, ACA and IRMAA, RMDs, 72(t), rule of 55, conversions and harvests under a MAGI budget. `m1` untouched.
- **0 Prep.** Every rule verified at its source and logged; six dictionary additions; an axe audit fixed in tokens only; edge-case tests that found the age-70 Social Security bug.

## 2. Maya tie-out (M1 conventions mode)

After every engine change: FI age 42 for all three strategies, 580 of 580 cells matching in both checkpoint files. Last run: after the foundations build (branch `foundations`). Full suite: 51 files, 522 tests, all passing.

## 3. Proposed specs written (review first)

| Spec | Branch | What it covers |
|---|---|---|
| `docs/coaching-spec.md` | `coaching-specs` | The weekly loop: twelve parts with dictionary additions and acceptance tests, what will not be copied, a build order |
| `docs/history-spec.md` | `foundations` | Progress snapshots: what is stored and why, when taken, the trend sentence, where it shows, five acceptance tests (built) |
| `docs/statement-upload-spec.md` | `foundations` | Browser-only reading of PDF and CSV statements by a pattern table, the preview, six acceptance tests (not built) |
| `docs/rules-update-routine.md` | `foundations` | The November and January verification calendar, the steps, the yearly table roll, two questions (a routine, not code) |
| `docs/performance-budget.md` | `foundations` | Measured sizes and timings, the budget and hard limits, the worker rule, how to measure on a phone (not built) |
| `docs/packs/README.md` and ten pack specs | `packs-specs` | Who, unlock condition, questions, reused pieces, what is new, and the new-engine-capability flag for each pack |
| `docs/household-two-spec.md` | `household-two` | The partner as a second person, ages and limits per person, taxes together or apart, Social Security for two, one retirement date, entry, eight acceptance tests |
| `docs/m6-spec.md` | `m6-risk` | The return series, historical backtests, the sturdy FI date, guardrails, Flex FI, seven acceptance tests |
| `docs/m4-spec.md` | `m4-meaning` | Ratio registry, metrics by level, lenses (4% rule, Shockingly simple math, DRAFTT, hours, taxes), the Advice Translator, eight acceptance tests |

## 4. Proposed decisions

| # | Where | Decision |
|---|---|---|
| R1 to R3 | `decisions.md` | Feature register: the rubric and threshold as the sort, v1 ports as views only after their claims pass the registry, the games and the server-backed pieces iced |
| C1 to C12 | `decisions.md` | Coaching: the weekly loop's twelve product decisions (spec section 16) |
| F1 to F6 | `decisions.md` | Foundations: the CI gate shape, the nudge reads preferences only, snapshots as the one stored derived value, the trend baseline, the trust pages and the delete button, the three specs |
| P1 to P3 | `decisions.md` | Packs: unlock by condition, dictionary and registry first, which packs need new engine capability |
| H1 to H8 | `decisions.md` | Households of two: one retirement date, how filing separately splits the returns, the unverified spousal and survivor rule and its flag, the optimizer moves the self's claiming age only, the waterfall fills the partner's workplace plan only, removing a partner, joint accounts read the older or younger owner, health care per adult |
| (engine) | `engine/model/rules.ts` | A ledger door for unverified rules, `getUnverified`, which records the rule with its blank verified date; the only rule read through it is `ss.spousalAndSurvivor`. Two-way |
| Q1 to Q6 | `decisions.md` | M6: the unverified return series, the backtest method, the sturdy date, guardrails, Flex FI, the two engine hooks |
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
9. The CI gate (`deploy.yml` and `ci.yml` on `foundations`): the deploy now also runs the Maya tie-out as a gate. Is that the right bar, and should the bundle-size check from `docs/performance-budget.md` join it?
10. The rules update routine asks who owns the November check and whether a rule verified more than 15 months ago should be refused or only flagged.
11. Households of two: should a married filing status with no partner be an error (the dictionary's validation) or the flag it is now? And is the survivor rule's start (the year after the first plan-to age) acceptable until mortality is modeled?
12. Spousal and survivor benefits: the registry entry `ss.spousalAndSurvivor` (50% spousal, reduced by the claimant's own factor; 100% survivor; larger of the two) was typed from memory. Please check it against ssa.gov; the real reduction schedules differ from the retirement one.

## 6. Skipped or unverified

| Item | Why | URL for you |
|---|---|---|
| `ss.wageBase.2026` lastVerified | ssa.gov blocked | https://www.ssa.gov/cola/factsheets/2026.html |
| Poverty guidelines, Alaska and Hawaii | hhs.gov blocked | https://aspe.hhs.gov/topical-subjects/poverty-economic-mobility/poverty-guidelines |
| SSA POMS IRMAA as a second source | ssa.gov blocked | https://secure.ssa.gov/poms.nsf/lnx/0601101020 |
| **Long-run return series** (M6) | Damodaran, Shiller, FRED, BLS, Treasury, and the Fed were all unreachable; `data/returns-history.json` is typed from memory and flagged unverified | https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html |
| `ss.spousalAndSurvivor` (households of two) | ssa.gov blocked; typed from memory, read through the unverified-rule door, every plan it changes is flagged | https://www.ssa.gov/benefits/retirement/planner/applying7.html and https://www.ssa.gov/benefits/survivors/ |
| State unemployment benefit table | dol.gov and oui.doleta.gov unreachable; national placeholder in `data/resilience.json` | https://oui.doleta.gov/unemploy/statelaws.asp |
| Medicaid expansion state list | medicaid.gov unreachable | https://www.medicaid.gov/medicaid/program-information/medicaid-and-chip-eligibility-levels/index.html |

No page fetched during this session contained instructions aimed at the build.

## 7. Self-audit scorecards

**Households of two** (`docs/audits/household-two-self-audit.md`): all eight acceptance tests pass, test 6 on an unverified rule; weak spots are the rule itself, mortality as the plan-to age, the filing-separately approximation, the partner's HSA and IRA outside the waterfall, one retirement date, and no partner view on the result screen yet.

**M6** (`docs/audits/m6-self-audit.md`): all seven acceptance tests pass on the mechanics; the series itself is the open item.

**M4** (`docs/audits/m4-self-audit.md`): all eight acceptance tests pass.

**M5** (`docs/audits/m5-self-audit.md`): all seven items pass; weak spots are unsourced block defaults and a browser prompt for the second timing.

**Levels** (`docs/audits/levels-self-audit.md`): Level 2 five of six pass (the unemployment state table is a placeholder); Level 3 milestones two of three pass (no hand-computed household yet); Level 5 four of six pass (no hand-checked estate; Hamilton theming not built).

**M3** (`docs/audits/m3-self-audit.md`): tests 5, 6, 7, 8 pass; 1, 2, 3, 4 partial (not timed with a person; only Maya asserted for the ranking rule; the result screen lacks the rough-results label; staleness widening not yet wired into the ranking); 9 passes by construction.

**M2** (`docs/audits/m2-self-audit.md`): acceptance tests 2 to 6 pass; test 1 is partial because the hand-checked Gross and Net FI values for the three households do not exist yet (only you can produce them). Weak spots named: health care placeholders, state tax on retirement income, the 72(t) annuitization approximation, the coordinate search, and no M2 workpaper yet. A suggested second Maya workpaper at M2 depth is described.

## 8. Feature register

On `feature-register`, docs only: `data/feature-register.json`, `docs/features/feature-register.md` (the full table), `implementation-plan.md` (above 25, by destination, in build order), `icebox.md`. The v1 repository was cloned read-only (commit 5ff7fd9) and inventoried room by room, engine by engine, including `dnd/`, `coach/`, and `marketing/`.

| | |
|---|---|
| Features | 244 |
| Scored above 25 (planned) | 224 |
| Icebox (25 or below) | 20 |

**Top twenty by score**

| Rank | Feature | Score | Destination |
|---|---|---|---|
| 1 | Decumulation (The Back Half) | 87 | M2 Level 4 (built) |
| 2 | Return on Hassle | 84 | M3 next card (built as value per minute) |
| 3 | Round 1 opening (five questions: take-home, FI band, coast date, ranked levers) | 84 | onboarding (Level 1) |
| 4 | Two-question opening with immediate runway | 84 | onboarding |
| 5 | Five-input opening | 83 | onboarding (Level 1 is these five) |
| 6 | Readiness score | 83 | coaching spec |
| 7 | Roth conversions versus ACA (the price of cover, cliff on and off) | 83 | M2 optimizer (built: acaTarget knob and MAGI budget) |
| 8 | Advice Translator | 82 | M4 (built) |
| 9 | Cost of not knowing (what a missing number costs in FI date, runway, net worth) | 82 | M3 materiality (built as the plausible range per input) |
| 10 | Between Jobs | 81 | Level 2 (built) |
| 11 | Quantum collapse onboarding module | 81 | Level 1 and the Sky (partly built: bands narrow with kinds) |
| 12 | Rule of 5 | 81 | Level 2 (built) |
| 13 | Worth the Hassle (Return on Hassle) | 81 | M3 next card (built as value per minute) |
| 14 | DRAFTT | 80 | M4 lens (built) |
| 15 | Earn more pack | 80 | pack |
| 16 | Partner (Family) | 80 | Households of two (built) and the Partner pack |
| 17 | Middle Class Trap test (wealth locked until 59 and a half, the paths through) | 79 | M2 Level 4 (built) and a lens |
| 18 | The Bridge (what reaches before 59 and a half) | 79 | M2 Level 4 (built: Roth basis, taxable, 72(t), rule of 55) |
| 19 | Money phases | 78 | coaching spec |
| 20 | Price the Dream | 78 | M5 price card (built) |

**Luxury-strategy claims that failed verification.** The SPARKS luxury strategies catalog and tradeoff matrix are not in the v1 repository (the word "luxury" appears only as a travel tier), so the four corrections you named are recorded as rules to carry into any copy that turns up: conversions do count toward MAGI for the ACA and IRMAA; the solo 401(k) is capped by the $72,000 annual additions limit; 2024 limits are replaced by the verified 2026 values; an out-of-state LLC changes nothing about where income is taxed. In their place the v1 moves and calculators were checked, and seventeen other claims fail: 2025 Social Security figures in a 2026 file, a $70,000 additions limit with no super catch-up, a solo 401(k) deferral that ignores profit, a stale ACA table (8.66% top, 8.5% cap) where 2026 is 9.96% with the cliff back, KFF 2024 premiums, three definitions of the Rule of Five, a FOO ladder mislabeled as the Money Guy's, DRAFTT and Triple D each defined two ways, a hard-coded 7% in the $30k/$90k rule, three withdrawal rates, an incomplete safe-harbor rule (no 110% tier), "an HSA is never taxed", unsourced card-reward rates, a $15,000 poverty line in the student loan engine, unverified unemployment rules, and fixed insurance multiples. Each is in `docs/features/feature-register.md` with the registry evidence and whether it ports.

## 9. Readiness audit top ten

From `docs/readiness.md`, in order:

1. A second Maya workpaper at M2 depth, then Jordan and Dev with expected values (only you can produce them).
2. Replace the return series and verify the spousal and survivor rule (two unverified data items flag every Risk result and every couple's late years).
3. Protect `main` and merge the CI gate from `foundations`.
4. Five people through the first five minutes, timed.
5. The eight attorney questions in the Trust section.
6. Extend the instructing-phrase scan to the plan text and the lessons, and decide the frame for "the plan does X".
7. The rules update routine's first run, with an owner.
8. Axe on every route and one screen-reader session.
9. Measure on a phone and move long work to a Web Worker.
10. A "something looks wrong" link and a visible version number.

## 10. Handoff

**Where I stopped:** every phase, 0 to 13, is complete and pushed; the last branch is `readiness`, which carries the final report. Nothing was merged to `main`. The branch chain, each from the one before: `prep-oct4`, `m2-engine`, `m2-optimizer`, `m3-flow`, `levels`, `m5-whatifs`, `m4-meaning`, `m6-risk`, `household-two`, `packs-specs`, `foundations`, `coaching-specs`, `feature-register`, `readiness`. Merging `readiness` into `main` brings everything; reviewing the Proposed specs in section 3 and the decisions in section 4 first is the order the build assumed.

**What is next, in the order the readiness audit gives:** the M2 workpaper (yours), the two unverified data items, protect `main` and merge the CI gate, five timed people, the attorney questions. The leftover `preflight-check` branch and the branch protection on `main` are still the two fixes from the preflight that the session could not make.

**Instructions found in fetched content:** none. No page or tool output fetched during the build contained instructions aimed at it.

**Edge-case verdicts (Phase 0d).** All sensible except two: the age-70 retire-now case showed $0 Social Security (fixed, commit 250e776), and age 100 gives an empty timeline rather than a message (the entry screen's 16-to-100 validation should stop it).
