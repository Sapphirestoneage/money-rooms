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

**Phase 13 in plain English.** `docs/readiness.md` grades the app across Math, Data, Trust and legal, Users, Upkeep, and Launch as Ready, Partial, or Missing, each with evidence and the work left. Ready: the Maya tie-out, the dictionary discipline, the disclaimer, sourced and dated rules, privacy, documentation. Missing: an M2-depth tie-out and any household beyond Maya, professional review, statement upload, sync, the weekly loop, retention signals, support, monitoring. The Trust section ends with eight questions for a securities attorney, no conclusions drawn. The top ten moves are in section 9.

**Phase 12 in plain English.** Every feature from v1 (cloned and inventoried: 37 live rooms, 60-odd engines, the D&D game, the coach console, the marketing board), the build's minimum list, the named frameworks, the coaching spec's parts, and this repo's unbuilt specs, one row each, scored on the six-part rubric with the points shown, ranked, top quartile marked, and sorted into a plan (above 25) or the icebox (25 or below). Section 8 has the totals and the top twenty. The luxury-strategies catalog turned out not to exist in v1; the four corrections are recorded, and seventeen other v1 claims that fail against the registry are listed with evidence. Decisions R1 to R3.

**Phase 11 in plain English.** `docs/coaching-spec.md`: the weekly loop in twelve parts, each with its engine sources, its dictionary additions (records only, never a second copy of a number), and acceptance tests: weekly rings (Check in, Move, Learn), an openable readiness score (runway 35, rough numbers 25, debt pressure 25, staleness 15), four guided programs (Couch to Roth, Debt-free sprint, First $10K, Before the promo ends), adaptive re-planning at the material line, personal records, four money phases read from the engine, the Sunday recap, rest days (the spending headroom that leaves the FI year unchanged), insights from tags with counts and the word pattern, coach mode through exports only with its privacy and consent requirements and the attorney question left open, two-minute lessons, and streaks with automatic freezes. A "what we will not copy" section: no streak guilt, no public comparison, no red or shame, no engagement for its own sake, no urgency, no dark patterns around coach mode. Decisions C1 to C12. Also: the rules update routine gained the monthly check with a report that the phase list asked for.

**Phase 10 in plain English.** Five pieces. (a) The Pages workflow is now test, then build, then deploy, each needing the one before, and a new `ci.yml` runs types, tests, the Maya tie-out, and the build on every other branch and pull request; both are on `foundations` for your review, main is untouched. (b) A backup nudge card (design system entry first) appears above any screen when the numbers have not been exported in 30 days, or ever, with Export and Not now. (c) `docs/history-spec.md` written, then built: one snapshot a day (date, FI year by band, net worth, savings rate, FI number) saved with the household so it is in the export, a "Your progress" section on the result screen with a trend sentence ("Since July 2026, your likely FI date moved 2 years earlier, your net worth rose $12,400, and your savings rate went from 22% to 25%") and a table of the last eight; eight engine tests. (d) About and Privacy pages with a footer on every screen; About says "Educational, not individualized financial, tax, or legal advice"; Privacy says the data stays in the browser, nothing is sent, and offers export and a delete-everything button behind the confirm panel. (e) Three specs, not built: `docs/statement-upload-spec.md`, `docs/rules-update-routine.md`, `docs/performance-budget.md`. Decisions F1 to F6.

**Phase 9 in plain English.** Ten expansion pack specs in `docs/packs/` with an index: Earn more, Self-employed, Home, Partner, Family, Move, Health, Taxes, Debt freedom, Coach. Each says who it is for, when it unlocks (always a condition read from the household, never a purchase), the questions it adds mapped to the dictionary, the engine pieces it reuses by name, what is new, acceptance tests, and what waits. The index table flags which packs need new engine capability: Earn more and Debt freedom need none; Self-employed (QBI, solo 401(k) room, S-corp salary), Home (a property bucket and a sale event), Family (credits and a 529 bucket), and Coach (a shared view, which waits on the audience decision) need the most. Decisions P1 to P3. Nothing built.

**Phase 8 in plain English.** `docs/household-two-spec.md` written (Proposed), then built. The partner is now a second person in the engine: their income runs in the same year loop with their own age, their own contribution limits and catch-ups, their own FICA cap, and their own Social Security record, benefit, and claiming age. Married filing jointly is one return on both incomes; married filing separately is two returns summed. Every account has an owner (mine, my partner's, or joint), and the owner's age decides the 10% tax, required distributions, HSA rules, and Roth ordering; a joint account reads the older for penalties and the younger for distributions. Health care in retirement is priced per adult. Spousal top-ups (half the other's PIA once both have claimed) and the survivor rule (the larger benefit after the first plan-to age) are built but read an unverified SSA rule through a new ledger door, so every plan they change carries a flag. The horizon runs to the younger person's plan-to age. On the entry screen: "Add a partner" on About you, "Whose income" on each stream, "Add partner's income", and "Whose account" on each account; removing a partner asks first. Nine tests cover the spec's eight acceptance tests; the 503 earlier tests and Maya are unchanged. Self-audit: `docs/audits/household-two-self-audit.md`.

**Phase 7 in plain English.** `docs/m6-spec.md` written (Proposed), then built: the engine gained per-year returns and a spending-rule hook (m1 untouched, Maya ties out), and `engine/risk/` replays the whole plan from every start year in a long-run real return series, reporting the success rate, the worst starts ("retiring with 1966's markets ahead ran short at 81"), the sturdy FI date at a threshold, guardrails spending (Guyton-Klinger, two guardrails), and Flex FI, which now has a real date on the Level 3 spectrum instead of "coming soon". A Risk screen shows all of it. **The return series could not be fetched (every data host is blocked), so `data/returns-history.json` was typed from memory of the Damodaran series and is marked unverified; every result built on it carries a flag.** Self-audit: `docs/audits/m6-self-audit.md`.

**Phase 6 in plain English.** `docs/m4-spec.md` written (Proposed), then built: a Meaning screen with the ratio registry (13 ratios from `data/ratios.json`, each with its formula, unlocked by level or on request), five lenses (the 4% rule against the True FI number, Shockingly simple math with its table against the plan's own years, the DRAFTT scorecard with therapy and taxes switchable, hours, taxes), and the Advice Translator (ten lines from `data/advice.json`, each applies, partly, or unlearn with a sentence from the person's numbers). A test scans every M4 sentence for instructing phrases. Self-audit: `docs/audits/m4-self-audit.md` (all eight pass).

**Phase 5 in plain English.** A What-ifs screen. Scenario blocks: pick a kind (home, car, kid, job change, sabbatical, move, side hustle, inheritance, marriage, custom), answer three or four questions (national defaults marked roughly), and the block lays its changes over a copy of your numbers; each block shows its change in monthly cash flow and the FI date moved, can carry several start dates to compare, can be turned off, and can replace another block. Dreams: each gets a price card in the spec's order (cost in time, true amount at 65, the other side of the trade as a question, best timing with a curve and markers from the plan's own events), plus the milestones it moves and ways to lower the price; the plan trims dreams first and wants second when short, and says from what age a trimmed dream fits. Payoff methods: avalanche, snowball, and peace-first side by side with months, interest, stress-months, and the price of peace. Engine in `engine/whatifs/` with 15 tests. Self-audit: `docs/audits/m5-self-audit.md`.

**Phase 4 in plain English.** A Levels screen with three cards. Level 2 Resilience: the Rule of 5 (matches the spec's worked example to the dollar), the spending staircase with must-pays on every step, the graceful path, the runway stack (cash, the ability to cut, unemployment, severance, reachable investments, break glass shown but not counted), health insurance after a job loss through the ACA mechanics, disability and term life, five shock tests with their effect on runway and the FI date, and the zombie-readiness headline. Level 3: the FIRE spectrum on one line (walk-away money, start a business, Coast, Lean, Barista, Slow, FI, Fat; Flex FI "coming soon") with each milestone's condition and what moves it, plus editable settings. Level 5: the estate after heirs' taxes by band and money type, giving and giving forever at the plan's own withdrawal rate, legacy projects with money and hours, Legacy FI and the breathing room, the freedom budget, and the basics checklist. 30 engine tests. Unemployment uses a national placeholder marked unverified (DOL pages unreachable). Self-audit: `docs/audits/levels-self-audit.md`.

**Phase 3 in plain English.** A new screen, What's next, with three tabs. Next: level progress ("You've covered 71% of what matters"), the next card (one big, two small) ranked by value per minute above the trivial and worth-it lines, the Refresh card for aged numbers (confirm restarts the clock, "since last time" after), the Rough numbers card sorted by materiality with a running bar, the small-wins promotion card, and a materiality setting (label above 5%). Small wins: one card at a time (Done, Not for me, Later) with the running total in dollars and months, personalized from the person's spending. The Sky: circles you zoom into by tap or keyboard with a breadcrumb trail, and an outline alternative. The entry screen gained a mode switch: one section at a time, all on one form, or paste everything. Engine: the materiality engine (plausible ranges by kind, sensitivity per input as a smooth dollar measure, the three lines, coverage), staleness clocks, items with computed values, small wins totals, and the Sky model, all in `engine/flow/` with 14 tests. Self-audit: `docs/audits/m3-self-audit.md` (two acceptance tests partial: the result screen does not yet carry the rough-results label, and widened staleness ranges are not yet fed into the ranking).

**Phase 2 in plain English.** The optimizer searches the policy knobs (conversion target, gain harvesting, ACA target, withdrawal order, 72(t), rule of 55, claiming age, contribution type) for one of four objectives, with the optional limits, in about a hundred projections. It returns the best plan, the baseline, and the plan in words ("Ages 40 to 44: Live on taxable savings. Convert about $16,100 a year..."). Year locks are honored and planned around. Strategy toggles report what turning each one off costs in years and dollars; the stress test reruns the plan with the sunsets gone, Social Security at its floor, and the worst band; tripwire flags name the rules the plan leans on. The result screen now has nine sections in a default order that can be rearranged (stored as a display preference), the True FI card (locked until the drawdown inputs are in, then revealed with a count-up unless motion is reduced, with a replay and a share card that hides dollars by default), the plan, the strategies, and the rules behind the plan with links and verified dates. The entry screen gained a Plan details card for the Level 4 inputs. Self-audit: `docs/audits/m2-self-audit.md`.

**Phase 1 in plain English.** The engine now has two modes. `m1` is the tied-out skeleton and does not change. `m2` reads every rule from the registry (and refuses unverified ones), taxes capital gains with cost basis, applies the Roth ordering rules with five-year conversion clocks, prices health care through the ACA credit (with the 2026 cliff) and IRMAA (two-year lookback), takes required distributions and 72(t) payments, honors the rule of 55 and governmental 457(b), sizes Roth conversions and 0% gain harvests under a MAGI budget, keeps part-time income after retirement, and adds the traditional IRA, 457(b), and mega backdoor steps to the waterfall. All of it is driven by a drawdown policy with per-year locks, ready for the optimizer. 25 new M2 tests plus 48 unit tests on the pieces. Engine spec section 10 documents the method; decisions N10 to N17 are Proposed.

**Phase 0 in plain English.** Every rule in the registry was opened at its IRS or CMS source and confirmed, the empty ones were filled (total additions limit, IRA and Roth phase-outs, 457(b), full brackets, capital gains, IRMAA tiers, ACA table, poverty guidelines), and every change is logged in `docs/rules-verification-2026-10.md`. Six dictionary additions are written as section 9 of the data dictionary. An axe audit found contrast failures on both screens in both themes; they are fixed in tokens only, and the audit is in `docs/accessibility-audit-2026-10.md`. Edge-case tests found one real bug (below) and are in `tests/edge-cases.test.ts`.

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
11. The CI gate (`deploy.yml` and `ci.yml` on `foundations`): the deploy now also runs the Maya tie-out as a gate. Is that the right bar, and should the bundle-size check from `docs/performance-budget.md` join it?
12. The rules update routine asks who owns the November check and whether a rule verified more than 15 months ago should be refused or only flagged.
9. Households of two: should a married filing status with no partner be an error (the dictionary's validation) or the flag it is now? And is the survivor rule's start (the year after the first plan-to age) acceptable until mortality is modeled?
10. Spousal and survivor benefits: the registry entry `ss.spousalAndSurvivor` (50% spousal, reduced by the claimant's own factor; 100% survivor; larger of the two) was typed from memory. Please check it against ssa.gov; the real reduction schedules differ from the retirement one.

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

**Edge-case verdicts (Phase 0d).** Sensible: no income with savings (date is now), no income and no savings (never funded, shortfall named from the first year), only debt (card paid off, high-interest step fires), age 16 (80-year horizon), spending above income (never funded, gap negative every year), 0% promo ending next month (one month of interest in the stub year, full rate after), all-dontknow import (reads clean, lists every unknown, household stays incomplete so no date shows). Confusing: age 70 still working showed a $0 Social Security benefit in the retire-now case (fixed, commit 250e776); and a person over 73 with a pretax balance sees no required distributions in M1 (expected, M2 strategy B5). Age 100 gives an empty timeline rather than a message; the entry screen's validation (16 to 100) should stop it first.
