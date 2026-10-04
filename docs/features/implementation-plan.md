# Implementation plan

**Status: Proposed, not reviewed by Eli.** Every feature scoring above 25 in `feature-register.md`, grouped by its v2 destination, in build order. Within a destination, content-only ports come first and small efforts before large; across destinations the order is the roadmap's: finish and verify what exists (M2 to M6, households of two), then onboarding and foundations, then the coaching loop, then packs, then the M7 views, then the rest.

Each entry: destination, what it needs from the engine and data model, content-only or new capability, dependencies, effort, and its place in the sequence. "Content" means it ports as wording, data, or a view on engine pieces that exist; "new" means the engine or the dictionary must grow first (and the dictionary comes first, per CLAUDE.md).


## Level 1

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 1 | Quantum collapse onboarding module | 81 | content | small | Level 1 and the Sky (partly built: bands narrow with kinds) |  | The band range already narrows as kinds improve; animate the collapse. |
| 2 | FOO questionnaire (Financial Order of Operations) | 76 | content | small | Level 1 and the waterfall (built) |  | The waterfall is the FOO; port the questionnaire's wording as the next card's explanations. |
| 3 | The two orders of operations (money and skill) | 75 | content | small | Level 1 waterfall (money, built) and the Earn more pack (skill) |  | Money order built; skill order is Earn more content. |
| 4 | The next $100 ranked | 74 | content | small | Level 1 waterfall (built) |  | Built; show the first step for $100. |

## Level 2

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 5 | Between Jobs | 81 | content | small | Level 2 (built) |  | Built as the runway stack and health after job loss. |
| 6 | Rule of 5 | 81 | content | small | Level 2 (built) |  | Built and ties out to the spec's example. |
| 7 | Zombie Apocalypse Theory of Savings | 75 | content | small | Level 2 (built as the zombie-readiness headline) |  | Built. |
| 8 | SWAN Number | 73 | content | small | Level 2 (the Rule of 5 and runway stack) |  | Name the Level 2 headline the SWAN number. |
| 9 | When It Won't All Get Paid (bill triage in three tiers, calls worth making, free help) | 73 | content | small | Level 2 staircase (built) plus content | Review the triage order with a counselor | The staircase's must-pays plus the triage content. |
| 10 | Worst plausible year | 72 | content | small | Level 2 shock tests (built) |  | Built. |
| 11 | Protection | 71 | content | small | Level 2 (partly built: disability gap, term life range) |  | Umbrella and the policy list are new rows. |
| 12 | Coverage checkup (out-of-pocket max, term life, disability, umbrella) | 69 | content | small | Level 2 (partly built) |  | Umbrella and out-of-pocket max are new rows. |

## M2

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 13 | Decumulation (The Back Half) | 87 | content | small | M2 Level 4 (built) |  | Built as the plan in words and the strategies. |
| 14 | Roth conversions versus ACA (the price of cover, cliff on and off) | 83 | content | small | M2 optimizer (built: acaTarget knob and MAGI budget) |  | Built; show the per-year trade as a table. |
| 15 | Middle Class Trap test (wealth locked until 59 and a half, the paths through) | 79 | content | small | M2 Level 4 (built) and a lens |  | The 'never touch retirement money' advice line plus a locked-share ratio. |
| 16 | The Bridge (what reaches before 59 and a half) | 79 | content | small | M2 Level 4 (built: Roth basis, taxable, 72(t), rule of 55) |  | Built in the engine; a bridge view is display. |
| 17 | Which Account (Roth versus traditional versus taxable on equal pre-tax cost) | 74 | content | small | M2 contribution-type knob and M4 lens (built) |  | Built; the equal-pre-tax-cost framing is a lens. |
| 18 | Retire or coast event (VPW, Social Security, health to 65) | 69 | content | small | M2 Level 4 and M6 guardrails (built); VPW is new | VPW table source | VPW is a withdrawal rule like the guardrails adjuster. |
| 19 | Left Behind (four options for an old 401(k), cost of cashing out) | 68 | content | small | M2 strategies (rule of 55 reads the plan) and a lesson |  | Content plus the cash-out cost from the engine. |
| 20 | SPARKS luxury strategies catalog (after correction) | 67 | content | medium | M2 strategy list (built) with corrections | Every claim checked against the registry | Port only the claims that pass verification; see the failed-claims list. |
| 21 | SPARKS tradeoff matrix (13 life metrics, lever cards, constraint mode, Pareto frontier, story mode) | 56 | new | large | M2 optimizer (objectives and limits exist) | The optimizer's limits are constraint mode; the frontier needs multi-objective search | The objectives and limits are built; the 13 life metrics are mostly not financial. |

## M3

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 22 | Return on Hassle | 84 | content | small | M3 next card (built as value per minute) |  | Built; name it. |
| 23 | Cost of not knowing (what a missing number costs in FI date, runway, net worth) | 82 | content | small | M3 materiality (built as the plausible range per input) |  | Built; show it in those three units. |
| 24 | Worth the Hassle (Return on Hassle) | 81 | content | small | M3 next card (built as value per minute) |  | The next card's value-per-minute ranking is this framework; name it on the card. |
| 25 | Quick wins (a 15-minute move with a dollar figure ending every session) | 76 | content | small | M3 small wins (built) |  | Built; the end-of-session timing is the coaching recap. |
| 26 | Field-status ledger | 74 | content | small | M3 Rough numbers card and the Sky (built) |  | Built. |
| 27 | Since last time (what moved; earned versus learned) | 74 | content | small | M3 Refresh card and progress history (built) |  | Built; add the earned-versus-learned split. |
| 28 | The Dashboard (where you are, next dollar, next lesson, FI range) | 72 | content | small | M3 What's next (built as the next card and level progress) |  | Built. |
| 29 | Inline ask (one blank row at the moment it is needed) | 71 | content | small | M3 next card and the unlock lists (built) |  | Built as the unlock items; inline asking on result rows is small. |
| 30 | Staleness ages (amber after 21 days) | 70 | content | small | M3 staleness clocks (built) |  | Built. |
| 31 | M3 gaps: rough-results label on the result screen; staleness widening in the ranking | 69 | content | small | M3 |  |  |
| 32 | Situation gate (folds what does not apply and says why) | 68 | content | small | M3 items (built as placeholders and notForMe) |  | Built in spirit; add the 'why' sentence. |
| 33 | Out-of-bounds flags (five flags in ladder order) | 67 | content | small | M3 next card and ratios bands (built) |  | Built as bands and flags. |
| 34 | Quick Math (HYSA switch, cost per use, 20/3/8, $30k/$90k habit) | 67 | content | small | M3 small wins and M4 lenses |  | HYSA switch is the bank.hysa win; the rest are lens lines. |
| 35 | The Rerank (cost order against value order, cut and keep lines) | 64 | content | small | M3 small wins and the price card |  | The 25x hard-code must read the plan's own FI number. |
| 36 | Credit card benefits calculator | 51 | content | small | M3 small wins (rewards.card exists) |  | One small win already; a fee-versus-rewards line is a small addition. |
| 37 | First Financial Picture interview tree | 70 | content | medium | M3 guided mode |  | The guided mode plus the materiality ranking decide the branches. |
| 38 | Moons and moves (17 strategy tracks, 98 moves unlocked by the numbers) | 65 | content | large | M3 small wins and M2 strategies (built); the rest as programs | Every move's claim checked against the registry | Many moves are small wins or strategy rows already; the rest are program steps. Several claims need correction (see the failed list). |
| 39 | The Planets (six planets, ten bands, three levels, 180 levels, 184 recipes) | 55 | content | large | M3 levels and the Sky (built with five levels) |  | Five levels replace 180; port the recipes' wording into items one by one. |
| 40 | FI Skill Tree (25 trees, Calculator Lab, 18 dialects, daily layer, skill stacker) | 47 | content | large | M3 levels and tiers (the tier format is kept) |  | The tier format is used by M3; the rest is content. The daily layer conflicts with the weekly stance. |
| 41 | Subscription finder (repeating charges) | 49 | new | small | M3 small wins (sub.audit) once CSV import exists | Statement upload | A small win today; automatic once statements are read. |

## M4

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 42 | Advice Translator | 82 | content | small | M4 (built) |  | Built. |
| 43 | DRAFTT | 80 | content | small | M4 lens (built) |  | Built as the DRAFTT lens. |
| 44 | Real Hourly Wage | 75 | content | small | M4 lens (built as the hours lens and ratio) |  | Already in v2 as ratio realHourlyWage and the hours lens; port the commute and work-cost inputs as roughly values. |
| 45 | What It Takes | 75 | content | small | M4 lens (simple math) |  | The Shockingly simple math lens covers most of it; add the 'by a date' inverse. |
| 46 | Lens toggle (dollars, hours of life, months of FI) | 74 | content | small | M4 hours lens; a global toggle is new display |  | Add the toggle to the format layer (display only). |
| 47 | Hours back calculator | 72 | content | small | M4 hours lens (built) |  | The hours lens. |
| 48 | Tax efficiency ratio | 72 | content | small | M4 ratio (built) |  | Built. |
| 49 | The Scorecard: nine numbers | 72 | content | small | M4 ratio registry (built) |  | Built; percentile and the age benchmark are the two missing (see below). |
| 50 | Your Shockingly Simple Math | 71 | content | small | M4 lens (built) |  | Built as the simple-math lens. |
| 51 | Convenience Method | 70 | content | small | M4 hours lens and small wins |  | The hours lens states it. |
| 52 | FIRE Number and FIRE Lab | 70 | content | small | M4 4% lens and True FI (built) |  | Built as the 4% lens and the True FI card. |
| 53 | Unlearning quiz (12 rules: still applies, not yet, outgrown) | 70 | content | small | M4 Advice Translator (built with ten lines) |  | Built; the quiz frame is display. |
| 54 | Metrics-unlocked shelf | 68 | content | small | M4 ratio registry (built) |  | Built as the ratio registry with unlock levels. |
| 55 | The Statement (net worth, pay still to come, where the next dollar lands) | 68 | content | small | M4 ratios and Level 5 (built in parts) |  | Human capital (pay still to come) is a new ratio over the timeline. |
| 56 | Worth It | 68 | content | small | M4 hours lens |  | The hours lens plus small wins. |
| 57 | FIRE Lab sensitivity grid (4x5) | 63 | content | small | M4 4% lens |  | A grid over two inputs the engine already searches. |
| 58 | Benchmarks (wealth multiplier, PAW, five levels of wealth, human capital) | 56 | content | small | M4 lenses | Sources for each benchmark | Content with sources; PAW is a formula, not a rule. |
| 59 | Radar (every banded ratio as a spoke) | 56 | content | small | M4 Meaning screen (display) |  | A chart over the ratio registry. |
| 60 | Values versus spending audit (top values against where the money goes, no score) | 56 | content | small | M4 Meaning (content) |  | No score, by its own rule; a table. |
| 61 | Where You Rank (guess your percentile, then see it) | 56 | content | small | M4 lens | SCF 2022 table sourced and dated | Content with a sourced table; the comparison is to a survey, not to people. |
| 62 | The Referee (nine debates with both sides on your numbers) | 74 | content | medium | M4 Advice Translator and lenses (built in part) |  | Both sides from the engine; a strong teaching piece. |
| 63 | Ratio explainers (what, why, what moves it, for 47 ratios) | 69 | content | medium | M4 ratio registry (13 ratios built with formulas) |  | Port the explanations for the ratios v2 keeps; review the rest one by one. |
| 64 | Lenses (34 rules of thumb in 7 domains) | 66 | content | medium | M4 lenses (five built) | Each rule checked | Port the lenses one at a time; each is content over ratios. |
| 65 | Benchmark source picker (17 voices: Money Guy, ChooseFI, MMM, JL Collins, Big ERN...) | 58 | content | medium | M4 lenses | Each voice's rule sourced | A source picker on lenses that have more than one voice. |

## M5

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 66 | Price the Dream | 78 | content | small | M5 price card (built) |  | Built as the price card. |
| 67 | What If life-event templates (ten, each in three bands) | 77 | content | small | M5 blocks (built, ten kinds) |  | Built; the three-band run is the band set. |
| 68 | Can I? | 74 | content | small | M5 price card | Price card and rest-day headroom (coaching spec 9) | Maps to the price card plus the rest-day headroom. |
| 69 | Debt calculator | 74 | content | small | M5 payoff (built) |  | Built. |
| 70 | Windfall and bonus room | 74 | content | small | M5 block (inheritance) plus the waterfall |  | The inheritance block plus the waterfall already place it; show the split. |
| 71 | Big Purchase | 73 | content | small | M5 blocks and price card (built) |  | The car block and the price card. |
| 72 | Timeline Comparator (three career paths) | 73 | content | small | M5 blocks (compare timings exists) |  | Three job-change blocks compared is this; add a side-by-side view. |
| 73 | Goal templates (14: wedding, deposit, trip, fertility, surgery, funeral, business...) | 72 | content | small | M5 goals (built) plus templates |  | Templates are data. |
| 74 | Reversibility (what a decision costs to undo, 15 decisions) | 71 | content | small | M5 price card and the decisions log's own vocabulary |  | A line on each block: how reversible. |
| 75 | Micro-retirement (a planned break with career momentum) | 68 | content | small | M5 sabbatical block (built) plus a momentum factor | Career penalty source | Add the momentum factor as a roughly value. |
| 76 | Reasons to keep a debt and the hold-back toggle | 67 | content | small | M5 payoff |  | A stress-rating cousin; the cost is the simulation's. |
| 77 | The Long Way Round | 67 | content | small | M5 block (sabbatical, job change) |  | Blocks cover it; port the framing. |
| 78 | The Sun (on route, or what would you change?) | 67 | content | small | M5 blocks |  | The What-ifs screen's opening question. |
| 79 | Dreamline (dreams priced a month, the target monthly income, the hours) | 65 | content | small | M5 price card (built) |  | The price card in monthly units. |
| 80 | Avalanche Generation | 64 | content | small | M5 payoff (avalanche built) |  | Built as the avalanche method. |
| 81 | Hybrid payoff order (quick wins under $1,000, then avalanche) | 64 | content | small | M5 payoff (three methods built) |  | One more ordering in payoffOrder. |
| 82 | Lever library (six levers plus earn $500 more, hours a week each) | 62 | content | small | M5 blocks (data unverified in v1) | Defaults need sources | Defaults were unverified in v1; re-source before porting. |
| 83 | Wheels (20/3/8, new versus used, depreciation, lease versus buy) | 62 | content | medium | M5 car block (built) plus content | Depreciation table source | The car block prices it; the comparisons are content over it. |
| 84 | The Long Way Round: five years down seven paths with shocks | 61 | content | medium | M5 blocks compared and Level 2 shocks |  | Block sets plus shocks; a side-by-side view. |
| 85 | Time Buckets | 59 | content | medium | M5 dreams (timing curve) | Goal buckets with age ranges exist | The dream timing curve covers half; the decade view is a new display. |

## M6

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 86 | Verified return series for M6 | 76 | content | small | M6 | A session that can reach the source | The biggest open data item. |
| 87 | Simulation tool | 75 | content | small | M6 (built as backtests) |  | Built as the historical backtest; Monte Carlo is a later option. |
| 88 | Guardrails applied to the plan's own FI date | 67 | content | small | M6 |  |  |
| 89 | Variable percentage withdrawal | 65 | content | small | M6 spending adjuster | VPW table source | An adjuster like guardrails. |
| 90 | Weather panel (concentration risk and the risks it cannot see) | 61 | content | small | M6 Risk screen |  | The Risk screen's intro; sequence risk is now seen (backtests). |

## Households of two

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 91 | Partner (Family) | 80 | content | small | Households of two (built) and the Partner pack |  | Built on `household-two`. |
| 92 | Verify the spousal and survivor rule | 71 | content | small | Households of two | ssa.gov access |  |
| 93 | Partner view on the result and levels screens | 66 | content | small | Households of two |  |  |

## Levels

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 94 | Level gaps: hand-computed milestone household; hand-checked estate; Hamilton theming | 60 | content | small | Levels | Eli's hand workpapers |  |

## onboarding

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 95 | Round 1 opening (five questions: take-home, FI band, coast date, ranked levers) | 84 | content | small | onboarding (Level 1) |  | The five-input opening with a coast date added (Level 3 Coast FI exists). |
| 96 | Two-question opening with immediate runway | 84 | content | small | onboarding |  | Two fields and the Level 2 runway function. |
| 97 | Five-input opening | 83 | content | small | onboarding (Level 1 is these five) |  | Level 1 already is this; make it the guided mode's first screen. |
| 98 | Descent (one number buys one true sentence: $2,500 a month means $750,000) | 74 | content | small | onboarding (the first sentence) |  | The x300 line is 25x in monthly units; the strongest onboarding sentence in v1. |

## Foundations

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 99 | History | 75 | content | small | Foundations (built as progress history) |  | Built in `docs/history-spec.md`. |
| 100 | Sealed backup (AES-256-GCM with a passphrase) | 67 | content | small | Foundations (export) |  | An optional passphrase on the export is small and raises trust. |
| 101 | Expenses from the bank (on-device CSV import) | 55 | new | medium | Foundations: statement upload spec | docs/statement-upload-spec.md | The CSV reader is the spec's first door. |
| 102 | Statement upload (browser-only, pattern table) | 63 | new | large | Foundations | PDF text library under the performance budget |  |
| 103 | PDF spend tracking with auto-categorization | 56 | new | large | Foundations spec: statement upload | docs/statement-upload-spec.md; no AI call | The spec keeps it in the browser by pattern table; categorization waits on transactions. |

## Math readiness

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 104 | Second Maya workpaper at M2 depth | 70 | content | medium | Math readiness | Eli | The audit tie-out for M2; only Eli can produce the expected values. |

## Upkeep

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 105 | Rules update routine | 78 | content | small | Upkeep |  | A routine, not code; the one thing that keeps the engine honest. |
| 106 | Performance budget (size check in CI, worker for long work) | 64 | new | medium | Upkeep |  |  |
| 107 | Backtests and the optimizer in a Web Worker | 60 | new | medium | Upkeep |  |  |

## coaching

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 108 | Readiness score | 83 | content | small | coaching spec | Level 2, M3 materiality, ratios |  |
| 109 | Money phases | 78 | content | small | coaching spec |  |  |
| 110 | Sunday recap | 78 | content | small | coaching spec | Progress history, rings |  |
| 111 | Rest days (permission to spend) | 76 | content | small | coaching spec | The FI search with spendingScale |  |
| 112 | Personal records | 70 | content | small | coaching spec | Progress history |  |
| 113 | Money Wrapped (the year in review) | 67 | content | small | coaching: recap (yearly) | Progress history | A yearly recap over the history. |
| 114 | Race to $100K (rungs to $1M) | 67 | content | small | coaching: records (round-number milestones) |  | The records' round numbers. |
| 115 | FI Address system | 62 | content | small | coaching: money phases |  | The phase word plus the level is the address; keep it private. |
| 116 | Streaks with grace | 62 | content | small | coaching spec | Weekly record |  |
| 117 | Financial Health Score (0 to 100 from six pillars by age cohort) | 61 | content | small | coaching: readiness score (specified, openable) |  | The readiness score replaces it with openable parts; a grade is a verdict. |
| 118 | DRAFTT video series as lesson content | 60 | content | small | coaching: lessons (DRAFTT lens is built) |  | Lesson content attached to the DRAFTT lens. |
| 119 | Your Credit File (five factors, which the app can see, never a score) | 58 | content | small | coaching: lessons |  | Content; the two factors the app sees (utilization, payments) are ratios. |
| 120 | FI-losophy | 56 | content | small | coaching: lessons |  | Lesson content. |
| 121 | Second Mouse | 53 | content | small | coaching: lessons |  | A lesson. |
| 122 | FAT | 52 | content | small | coaching: lessons |  | Needs its definition from Eli before porting. |
| 123 | Triple D plan | 51 | content | small | coaching: programs |  | Needs its definition. |
| 124 | Fulfillment curve (joy against spending, four corners) | 50 | content | small | coaching: tags |  | Ratings as tags. |
| 125 | Skill Stacker (three skills at a time, did or didn't, what a day was worth) | 48 | content | small | coaching: programs |  | A program's weekly steps. |
| 126 | The Calendar (31 days plus your own non-money dates) | 48 | content | small | coaching: small wins with dates |  | Small wins with a date are this. |
| 127 | Guided programs (four drafted) | 77 | content | medium | coaching spec | data/programs.json |  |
| 128 | Weekly money rings | 77 | content | medium | coaching spec | Staleness, small wins, lessons |  |
| 129 | Short guided lessons | 73 | content | medium | coaching spec | data/lessons.json |  |
| 130 | Walk-Through (five stages, 15 to 20 steps) | 73 | content | medium | coaching: programs |  | The programs' shape; port the stage wording. |
| 131 | Scenario-based learning (decision cases) | 67 | content | medium | coaching: lessons | Lessons content | Lessons with placeholders filled by the engine. |
| 132 | Exercise library (65 exercises: computed runs, canon, 15-minute tasks) | 65 | content | medium | coaching: lessons and small wins | Each exercise checked | Content; the computed runs map to lenses. |
| 133 | Glossary (390 tap-to-define terms) | 59 | content | medium | coaching: lessons | Review every definition against the registry | Content; many rule-of-thumb definitions need checking. |
| 134 | Prospective and retroactive worth (predicted before, rated after, regrets) | 49 | content | medium | coaching: tags and insights |  | Tags on past decisions; insights after eight weeks. |
| 135 | Campaign (scenario rounds on a fork of your household, scored against the FOO) | 48 | content | large | coaching: lessons (as cases) |  | The cases are content; the game frame is the icebox's D&D row. |
| 136 | Adaptive plans (re-planning) | 66 | new | medium | coaching spec | Programs |  |
| 137 | Insights from tags | 51 | new | medium | coaching spec | Eight weeks of tags | Low until data exists. |
| 138 | Coach mode (weekly loop with a coach) | 58 | new | large | coaching spec | Audience decision, attorney |  |

## pack

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 139 | Earn more pack | 80 | content | small | pack |  |  |
| 140 | Debt freedom pack (debt-free date, refinance block, IDR) | 76 | content | small | pack | IDR rules are new |  |
| 141 | Career Move | 75 | content | small | pack: Earn more |  | The Earn more pack is this room. |
| 142 | Offer Compare (two to four offers side by side) | 71 | content | small | pack: Earn more |  | Job-change blocks side by side. |
| 143 | W-2 versus 1099 and the contract rate (quarterly estimates with safe harbor) | 70 | content | small | pack: Self-employed | Safe-harbor rule to the registry | Content over computeSelfEmploymentTax; the safe harbor is a registry rule to add. |
| 144 | Annual tax planning checklist | 69 | content | small | pack: Taxes, and the coaching lessons |  | Content attached to the strategy rows with dates. |
| 145 | Down Payment Countdown (four ways in and when you get there) | 65 | content | small | pack: Home and M5 goals | PMI and FHA rules to the registry | A goal with a date, plus the home block. |
| 146 | Family: shared month split (equal, proportional, pooled) | 62 | content | small | pack: Partner |  | A view over two incomes and one spending total. |
| 147 | Mortgage stress (what breaks the deal) | 61 | content | small | pack: Home and Level 2 shocks |  | A shock on the home block. |
| 148 | Degree as a sum (payback) | 55 | content | small | pack: Earn more (skill order) |  | A block with a cost and a raise. |
| 149 | Money date night planner (monthly, couples) | 55 | content | small | pack: Partner and coaching rings |  | The Check in ring for two; content. |
| 150 | Tax | 76 | content | medium | pack: Taxes | Taxes pack | The return view is the Taxes pack's first piece. |
| 151 | Health pack (sourced placeholders, COBRA, long-term care, age curve) | 77 | new | medium | pack | cms.gov and healthcare.gov sourcing |  |
| 152 | Taxes pack (return view, itemizing, loss harvesting, state retirement rules) | 72 | new | medium | pack |  |  |
| 153 | Move pack (dated state, places comparison, abroad) | 66 | new | medium | pack | FEIE rule; cost-of-living source |  |
| 154 | Partner pack (two retirement dates, partner claiming knob, mortality) | 66 | new | medium | pack | Life table to source |  |
| 155 | Kids and Tuition | 64 | new | medium | pack: Family | Family pack: credits and the 529 bucket | Needs the 529 bucket and the child credits. |
| 156 | Student Loan Decision | 62 | new | medium | pack: Debt freedom | Debt freedom pack; current IDR rules in the registry | Rules changed in 2025 and 2026; every number must be re-sourced before porting. |
| 157 | Coach pack (view-only mode, coach export, notes) | 61 | new | medium | pack | Audience decision |  |
| 158 | Variable Income | 61 | new | medium | pack: Self-employed | Monthly cash model; the v2 model is annual | The buffer sizing is new; the annual model needs a monthly floor. |
| 159 | Benefits cliff (what a raise takes away: Medicaid, SNAP, ACA) | 58 | new | medium | pack: Health (ACA cliff built); SNAP and Medicaid need sources | State tables unreachable | The ACA cliff is built; the rest waits on sources. |
| 160 | House hack calculator | 48 | new | medium | pack: Home (later) | Home pack; rental income stream | Waits on the Home pack's property bucket and the rental stream. |
| 161 | Skill calculator | 48 | new | medium | pack: Earn more (later) |  | A raise block prices the outcome; the skill side is content. |
| 162 | The Deal (rental underwriting: cap rate, cash-on-cash, DSCR) | 44 | new | medium | pack: Home (later, with the rental stream) |  | Rental income waits on the property bucket. |
| 163 | Housing Decision | 70 | new | large | pack: Home | Home pack: property bucket, sale event | Needs the home as an account. |
| 164 | Home pack (property bucket, sale event, rent versus buy) | 67 | new | large | pack |  |  |
| 165 | Self-employed pack (QBI, solo 401(k) room, S-corp salary, estimated taxes) | 65 | new | large | pack | Registry rules to verify |  |
| 166 | Family pack (dependents, credits, 529) | 61 | new | large | pack | Registry rules to verify |  |
| 167 | Aliyah Math (template for any country move) | 49 | new | large | pack: Move (abroad) | Move pack: FEIE, foreign tax placeholder | Needs the abroad block; the country template is content. |

## Coach pack

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 168 | Get Help | 66 | content | small | Coach pack and the About page |  | Content only; the attorney question applies. |
| 169 | Client Google Sheet workflow | 61 | content | small | Coach pack (export shape) | Coach pack export | The coach export replaces the sheet one column at a time. |
| 170 | Client view (life map, goals, what changed, homework, check-in by 35 and 65 days) | 53 | new | medium | Coach pack view-only mode | Audience decision |  |
| 171 | Coach Home (roster with stage, last session, rough or stale counts, check-in status) | 51 | new | medium | Coach pack (local list, after the audience decision) | Audience decision |  |
| 172 | Coach mode (client picker, read-only share link, monthly check-ins, comments) | 60 | new | large | Coach pack and coaching spec 11 | Audience decision; attorney question; a share link needs a server or a file | The share link conflicts with the no-server promise; the file path is specified. |
| 173 | Session console (nine stops, entry forms, done-when tests, detours) | 50 | new | large | Coach pack and coaching spec 11 | Audience decision |  |

## data

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 174 | Ownership chips (one owner room per number) | 72 | content | small | Data dictionary rule (built: one store per fact, as-of on every value) |  | Built as the architecture; the chip is display. |
| 175 | Lane 2 sourced tables (2025 and 2026 limits, brackets, ACA, student loans) | 68 | content | small | data: rules registry (built; cross-check the two) |  | Cross-check v1's lane-2 values against the v2 registry; both claim sources. |
| 176 | Modern Orthodox community life-planning tool (community preset set) | 62 | content | small | data: assumption and preset sets | Assumption sets exist; spending presets per community | A preset set is content; keep the engine neutral. |

## M7

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 177 | The Documents (income statement, cash flow, balance sheet, FIRE statement) | 73 | content | small | M7 view over the timeline |  | The accountant's view; every line ties to a row. A natural audit artifact. |
| 178 | Room export (any room as CSV, JSON, or print) | 54 | content | small | M7 views |  | Per-screen export is small once the screens are views. |
| 179 | Cash flow Sankey with per-tag budgets | 51 | content | medium | M7 room (view) | Spending categories; per-tag budgets contradict decision 'one total' (advice line budgetCategories) | The Sankey view is cheap; per-tag budgets conflict with the one-total stance and go to the icebox. |
| 180 | M7 porting v1 rooms as views | 62 | content | large | M7 | This register | This register is the port plan. |
| 181 | Money Calendar and Pay-Later | 55 | new | medium | M7 room | Needs transaction-level dates the v2 model does not hold (annual rows only) | A cash-flow timing layer is new machinery; the v2 model is annual. |

## icebox

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 182 | Share card, QR, and the household in a URL fragment | 56 | content | small | icebox |  | A URL carrying the household is a data leak waiting in a browser history; the share card without amounts is built. |
| 183 | Second Mouse framework (informed-player checklist for bonuses and arbitrage) | 43 | content | small | icebox |  | Nothing to attach it to, as v1 found. |
| 184 | Context packer and per-room Claude commands | 33 | content | small | icebox |  | Development tooling; v2's CLAUDE.md and docs serve the purpose. |
| 185 | Feature switches (18 switches, beginner and FI presets) | 49 | content | medium | icebox |  | Levels and materiality replace switches; the few that matter are settings already. |
| 186 | Pilot's Dashboard (seven instruments) | 48 | content | medium | icebox |  | A second metaphor over the ratio registry; the ratios already show the same numbers. |
| 187 | Arrangements (the rooms shelved 20 ways) | 42 | content | medium | icebox |  | One ranking (the next card) replaces twenty shelvings. |
| 188 | Income this month and the log (dated pay entries taxed four ways) | 42 | new | medium | icebox |  | The v2 model is annual streams, not a pay log; the stream's pay frequency covers the common case. |
| 189 | The Month: day-by-day account balance and where it flows | 41 | new | medium | icebox |  | Annual model; see Money Calendar. |
| 190 | Every place money went and the slope of the month | 38 | new | medium | icebox |  | Needs transactions. |
| 191 | Variance (estimated versus actual, trend, pattern) | 38 | new | medium | icebox |  | Needs the close. |
| 192 | The Close (estimate beside actual, month-end close) | 36 | new | medium | icebox |  | A budget close contradicts the one-total stance and needs transactions. |
| 193 | On the cards (which card, rate, pace to a sign-up bonus) | 35 | new | medium | icebox |  | Rewards hunting is not a plan input. |
| 194 | Vacation and travel calculator (flights, hotels, points, safety overlay) | 27 | new | medium | icebox |  | A goal template covers the plan; the rest is a travel site. |
| 195 | Client portal (Supabase magic-link logins) | 27 | new | large | icebox |  | A server breaks the privacy promise; a different product. |

## Bands

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 196 | 3D toggle (dream, default, disaster) | 72 | content | small | Bands (built: best, likely, worst) |  | The three bands are this; keep the band names. |

## Get Help content

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 197 | Trust framework (three-question advisor vetting) | 59 | content | small | Get Help content | Attorney review of wording | Content on the About page or Get Help. |

## Level 3 milestones

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 198 | FIRE variants (standard, lean, chubby, fat, coast, barista) | 72 | content | small | Level 3 milestones (built) |  | Built as the spectrum. |

## Level 3 spectrum and M5 blocks

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 199 | Journey map (four routes: as-is, scenic, death march, coast then cruise) | 64 | content | medium | Level 3 spectrum and M5 blocks |  | The spectrum line plus named block sets. |

## Level 3 walk-away money and start a business

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 200 | Quit fund (months of freedom by choice; start a business) | 72 | content | small | Level 3 walk-away money and start a business (built) |  | Built. |

## Level 5

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 201 | Estate Basics | 68 | content | small | Level 5 (built) |  | Built as the basics checklist and the estate view. |
| 202 | Giving | 66 | content | small | Level 5 (built) |  | Built. |

## Level 5 estate view

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 203 | After-tax net worth (deferred tax on pretax accounts) | 76 | content | small | Level 5 estate view (built as estate after heirs' taxes) |  | Add the ratio for the living person, not only the estate. |

## Level 5 freedom budget and spending phases

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 204 | Enough (what you would live on by choice; a second FI number) | 72 | content | small | Level 5 freedom budget and spending phases (built in parts) |  | A second spending row set is a phase. |

## Privacy page

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 205 | Privacy receipt (counts requests to other origins) | 69 | content | small | Privacy page |  | A live counter under the privacy promise; small and honest. |

## The Sky

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 206 | Room map and visited bar | 58 | content | small | The Sky (built) |  | Built. |

## accounts allocation

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 207 | The Mix (target stock, bond, cash and a rebalance band in dollars) | 56 | content | small | accounts allocation (built per account); household target is new |  | A household-level target and the dollars to move. |

## engine

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 208 | Social Security estimate from income and claiming age | 74 | content | small | engine (built, with the earnings record) |  | Built; v1's bend points were stale (claims list). |

## engine ages

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 209 | FIRE tiers and the age milestone ladder (50, 55, 59.5, 62, 65, 67, 70, 73) | 69 | content | small | engine ages (built: every one is a rule) |  | Built as rules; mark them on the chart. |

## entry

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 210 | Demo persona (try with example numbers) | 69 | content | small | entry (built: Maya, Jordan, Dev examples) |  | Built. |

## entry help text

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 211 | Band 1 Sketch help (18 questions, where to look, a defensible start, I am not sure) | 77 | content | small | entry help text |  | Port the 18 help texts to the entry fields. |

## entry presets

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 212 | Suggestions (derived values proposed, never stored until confirmed) | 73 | content | small | entry presets (built as preset values marked roughly) |  | Built. |

## entry screen

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 213 | Progressive disclosure via fold | 68 | content | small | entry screen (built as collapsible sections) |  | Built. |
| 214 | Save confirmation with undo | 67 | content | small | entry screen (partly built: import undo) |  | Import undo exists; field-level undo is small. |
| 215 | Undo and redo across pages | 57 | content | medium | entry screen |  | Import undo exists; a general undo stack is medium. |

## entry screen and the dictionary

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 216 | The Ledger (97 rows of three kinds) | 76 | content | small | entry screen and the dictionary (built) |  | Built as the entry screen with kinds. |

## entry sections

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 217 | Six DAITE doors (Debt, Assets, Income, Taxes, Expenses, You) | 59 | content | small | entry sections (built as five sections) |  | The entry sections are the doors. |

## entry: paste mode

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 218 | Quick entry shorthand (car 450/mo 5.9% 38 left) | 65 | content | small | entry: paste mode (built as the template paste) |  | A shorthand parser beside the CSV template; good for the coach. |

## income stream businessExpensesAnnual

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 219 | Costs of earning income (deductible costs on a 1099 source) | 69 | content | small | income stream businessExpensesAnnual (built) |  | Built. |

## income streams with starts and ends

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 220 | What comes next (future income as dated periods, gaps and overlaps) | 68 | content | small | income streams with starts and ends (built) |  | Built; a period chart is display. |

## progress history trend sentence

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 221 | Coach recap (snapshot diff in plain words, print to PDF) | 66 | content | small | progress history trend sentence (built) plus print |  | Built as the trend sentence; add print. |

## spending categories

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 222 | Expenses as FAT and wants with a therapy line | 64 | content | small | spending categories (built; DRAFTT lens) |  | The categories exist; FAT is a grouping over them. |

## trace drawer

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 223 | Show the math | 78 | content | small | trace drawer (built) |  | Built. |

## transfer card and Privacy page

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 224 | Your Data (save or load, paste statement lines sorted, CSV round trip, start over) | 71 | content | small | transfer card and Privacy page (built) |  | Built. |

## The sequence in one paragraph

First the things only Eli can give (the M2 workpaper, the hand tie-outs), the two unverified rules (the return series, spousal and survivor), and the small M3, M6, and households-of-two gaps, because every later feature stands on them. Then onboarding (the two-question and five-input openings are Level 1 reshaped) and the foundations (statement upload after the performance budget's worker and size check). Then the coaching loop in its own build order (coaching spec section 15). Then the packs by value against engine cost: Earn more and Debt freedom (no new engine), Health and Taxes (small engine pieces), Partner and Move, then Home, Family, and Self-employed (new buckets and rules), and Coach last, after the audience decision. The M7 room ports are views on all of that and go wherever their destination lands.
