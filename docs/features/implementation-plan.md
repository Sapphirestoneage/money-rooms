# Implementation plan

**Status: Proposed, not reviewed by Eli.** Every feature scoring above 25 in `feature-register.md`, grouped by its v2 destination, in build order. Within a destination, content-only ports come first and small efforts before large; across destinations the order is the roadmap's: finish and verify what exists (M2 to M6, households of two), then onboarding and foundations, then the coaching loop, then packs, then the M7 views, then the rest.

Each entry: destination, what it needs from the engine and data model, content-only or new capability, dependencies, effort, and its place in the sequence. "Content" means it ports as wording, data, or a view on engine pieces that exist; "new" means the engine or the dictionary must grow first (and the dictionary comes first, per CLAUDE.md).


## Level 1

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 1 | Quantum collapse onboarding module | 81 | content | small | Level 1 and the Sky (partly built: bands narrow with kinds) |  | The band range already narrows as kinds improve; animate the collapse. |
| 2 | FOO questionnaire (Financial Order of Operations) | 76 | content | small | Level 1 and the waterfall (built) |  | The waterfall is the FOO; port the questionnaire's wording as the next card's explanations. |
| 3 | The two orders of operations (money and skill) | 75 | content | small | Level 1 waterfall (money, built) and the Earn more pack (skill) |  | Money order built; skill order is Earn more content. |

## Level 2

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 4 | Between Jobs | 81 | content | small | Level 2 (built) |  | Built as the runway stack and health after job loss. |
| 5 | Rule of 5 | 81 | content | small | Level 2 (built) |  | Built and ties out to the spec's example. |
| 6 | Zombie Apocalypse Theory of Savings | 75 | content | small | Level 2 (built as the zombie-readiness headline) |  | Built. |
| 7 | SWAN Number | 73 | content | small | Level 2 (the Rule of 5 and runway stack) |  | Name the Level 2 headline the SWAN number. |
| 8 | Protection | 71 | content | small | Level 2 (partly built: disability gap, term life range) |  | Umbrella and the policy list are new rows. |

## M2

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 9 | Decumulation (The Back Half) | 87 | content | small | M2 Level 4 (built) |  | Built as the plan in words and the strategies. |
| 10 | SPARKS luxury strategies catalog (after correction) | 67 | content | medium | M2 strategy list (built) with corrections | Every claim checked against the registry | Port only the claims that pass verification; see the failed-claims list. |
| 11 | SPARKS tradeoff matrix (13 life metrics, lever cards, constraint mode, Pareto frontier, story mode) | 56 | new | large | M2 optimizer (objectives and limits exist) | The optimizer's limits are constraint mode; the frontier needs multi-objective search | The objectives and limits are built; the 13 life metrics are mostly not financial. |

## M3

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 12 | Return on Hassle | 84 | content | small | M3 next card (built as value per minute) |  | Built; name it. |
| 13 | Worth the Hassle (Return on Hassle) | 81 | content | small | M3 next card (built as value per minute) |  | The next card's value-per-minute ranking is this framework; name it on the card. |
| 14 | Field-status ledger | 74 | content | small | M3 Rough numbers card and the Sky (built) |  | Built. |
| 15 | M3 gaps: rough-results label on the result screen; staleness widening in the ranking | 69 | content | small | M3 |  |  |
| 16 | Credit card benefits calculator | 51 | content | small | M3 small wins (rewards.card exists) |  | One small win already; a fee-versus-rewards line is a small addition. |
| 17 | First Financial Picture interview tree | 70 | content | medium | M3 guided mode |  | The guided mode plus the materiality ranking decide the branches. |
| 18 | FI Skill Tree (25 trees, Calculator Lab, 18 dialects, daily layer, skill stacker) | 47 | content | large | M3 levels and tiers (the tier format is kept) |  | The tier format is used by M3; the rest is content. The daily layer conflicts with the weekly stance. |

## M4

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 19 | Advice Translator | 82 | content | small | M4 (built) |  | Built. |
| 20 | DRAFTT | 80 | content | small | M4 lens (built) |  | Built as the DRAFTT lens. |
| 21 | Real Hourly Wage | 75 | content | small | M4 lens (built as the hours lens and ratio) |  | Already in v2 as ratio realHourlyWage and the hours lens; port the commute and work-cost inputs as roughly values. |
| 22 | What It Takes | 75 | content | small | M4 lens (simple math) |  | The Shockingly simple math lens covers most of it; add the 'by a date' inverse. |
| 23 | Hours back calculator | 72 | content | small | M4 hours lens (built) |  | The hours lens. |
| 24 | Tax efficiency ratio | 72 | content | small | M4 ratio (built) |  | Built. |
| 25 | Your Shockingly Simple Math | 71 | content | small | M4 lens (built) |  | Built as the simple-math lens. |
| 26 | Convenience Method | 70 | content | small | M4 hours lens and small wins |  | The hours lens states it. |
| 27 | FIRE Number and FIRE Lab | 70 | content | small | M4 4% lens and True FI (built) |  | Built as the 4% lens and the True FI card. |
| 28 | Metrics-unlocked shelf | 68 | content | small | M4 ratio registry (built) |  | Built as the ratio registry with unlock levels. |
| 29 | Worth It | 68 | content | small | M4 hours lens |  | The hours lens plus small wins. |

## M5

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 30 | Price the Dream | 78 | content | small | M5 price card (built) |  | Built as the price card. |
| 31 | Can I? | 74 | content | small | M5 price card | Price card and rest-day headroom (coaching spec 9) | Maps to the price card plus the rest-day headroom. |
| 32 | Debt calculator | 74 | content | small | M5 payoff (built) |  | Built. |
| 33 | Windfall and bonus room | 74 | content | small | M5 block (inheritance) plus the waterfall |  | The inheritance block plus the waterfall already place it; show the split. |
| 34 | Big Purchase | 73 | content | small | M5 blocks and price card (built) |  | The car block and the price card. |
| 35 | Timeline Comparator (three career paths) | 73 | content | small | M5 blocks (compare timings exists) |  | Three job-change blocks compared is this; add a side-by-side view. |
| 36 | The Long Way Round | 67 | content | small | M5 block (sabbatical, job change) |  | Blocks cover it; port the framing. |
| 37 | Avalanche Generation | 64 | content | small | M5 payoff (avalanche built) |  | Built as the avalanche method. |
| 38 | Time Buckets | 59 | content | medium | M5 dreams (timing curve) | Goal buckets with age ranges exist | The dream timing curve covers half; the decade view is a new display. |

## M6

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 39 | Verified return series for M6 | 76 | content | small | M6 | A session that can reach the source | The biggest open data item. |
| 40 | Simulation tool | 75 | content | small | M6 (built as backtests) |  | Built as the historical backtest; Monte Carlo is a later option. |
| 41 | Guardrails applied to the plan's own FI date | 67 | content | small | M6 |  |  |

## Households of two

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 42 | Partner (Family) | 80 | content | small | Households of two (built) and the Partner pack |  | Built on `household-two`. |
| 43 | Verify the spousal and survivor rule | 71 | content | small | Households of two | ssa.gov access |  |
| 44 | Partner view on the result and levels screens | 66 | content | small | Households of two |  |  |

## Levels

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 45 | Level gaps: hand-computed milestone household; hand-checked estate; Hamilton theming | 60 | content | small | Levels | Eli's hand workpapers |  |

## onboarding

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 46 | Two-question opening with immediate runway | 84 | content | small | onboarding |  | Two fields and the Level 2 runway function. |
| 47 | Five-input opening | 83 | content | small | onboarding (Level 1 is these five) |  | Level 1 already is this; make it the guided mode's first screen. |

## Foundations

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 48 | History | 75 | content | small | Foundations (built as progress history) |  | Built in `docs/history-spec.md`. |
| 49 | Statement upload (browser-only, pattern table) | 63 | new | large | Foundations | PDF text library under the performance budget |  |
| 50 | PDF spend tracking with auto-categorization | 56 | new | large | Foundations spec: statement upload | docs/statement-upload-spec.md; no AI call | The spec keeps it in the browser by pattern table; categorization waits on transactions. |

## Math readiness

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 51 | Second Maya workpaper at M2 depth | 70 | content | medium | Math readiness | Eli | The audit tie-out for M2; only Eli can produce the expected values. |

## Upkeep

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 52 | Rules update routine | 78 | content | small | Upkeep |  | A routine, not code; the one thing that keeps the engine honest. |
| 53 | Performance budget (size check in CI, worker for long work) | 64 | new | medium | Upkeep |  |  |
| 54 | Backtests and the optimizer in a Web Worker | 60 | new | medium | Upkeep |  |  |

## coaching

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 55 | Readiness score | 83 | content | small | coaching spec | Level 2, M3 materiality, ratios |  |
| 56 | Money phases | 78 | content | small | coaching spec |  |  |
| 57 | Sunday recap | 78 | content | small | coaching spec | Progress history, rings |  |
| 58 | Rest days (permission to spend) | 76 | content | small | coaching spec | The FI search with spendingScale |  |
| 59 | Personal records | 70 | content | small | coaching spec | Progress history |  |
| 60 | FI Address system | 62 | content | small | coaching: money phases |  | The phase word plus the level is the address; keep it private. |
| 61 | Streaks with grace | 62 | content | small | coaching spec | Weekly record |  |
| 62 | DRAFTT video series as lesson content | 60 | content | small | coaching: lessons (DRAFTT lens is built) |  | Lesson content attached to the DRAFTT lens. |
| 63 | FI-losophy | 56 | content | small | coaching: lessons |  | Lesson content. |
| 64 | Second Mouse | 53 | content | small | coaching: lessons |  | A lesson. |
| 65 | FAT | 52 | content | small | coaching: lessons |  | Needs its definition from Eli before porting. |
| 66 | Triple D plan | 51 | content | small | coaching: programs |  | Needs its definition. |
| 67 | Guided programs (four drafted) | 77 | content | medium | coaching spec | data/programs.json |  |
| 68 | Weekly money rings | 77 | content | medium | coaching spec | Staleness, small wins, lessons |  |
| 69 | Short guided lessons | 73 | content | medium | coaching spec | data/lessons.json |  |
| 70 | Scenario-based learning (decision cases) | 67 | content | medium | coaching: lessons | Lessons content | Lessons with placeholders filled by the engine. |
| 71 | Adaptive plans (re-planning) | 66 | new | medium | coaching spec | Programs |  |
| 72 | Insights from tags | 51 | new | medium | coaching spec | Eight weeks of tags | Low until data exists. |
| 73 | Coach mode (weekly loop with a coach) | 58 | new | large | coaching spec | Audience decision, attorney |  |

## pack

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 74 | Earn more pack | 80 | content | small | pack |  |  |
| 75 | Debt freedom pack (debt-free date, refinance block, IDR) | 76 | content | small | pack | IDR rules are new |  |
| 76 | Career Move | 75 | content | small | pack: Earn more |  | The Earn more pack is this room. |
| 77 | Annual tax planning checklist | 69 | content | small | pack: Taxes, and the coaching lessons |  | Content attached to the strategy rows with dates. |
| 78 | Tax | 76 | content | medium | pack: Taxes | Taxes pack | The return view is the Taxes pack's first piece. |
| 79 | Health pack (sourced placeholders, COBRA, long-term care, age curve) | 77 | new | medium | pack | cms.gov and healthcare.gov sourcing |  |
| 80 | Taxes pack (return view, itemizing, loss harvesting, state retirement rules) | 72 | new | medium | pack |  |  |
| 81 | Move pack (dated state, places comparison, abroad) | 66 | new | medium | pack | FEIE rule; cost-of-living source |  |
| 82 | Partner pack (two retirement dates, partner claiming knob, mortality) | 66 | new | medium | pack | Life table to source |  |
| 83 | Kids and Tuition | 64 | new | medium | pack: Family | Family pack: credits and the 529 bucket | Needs the 529 bucket and the child credits. |
| 84 | Student Loan Decision | 62 | new | medium | pack: Debt freedom | Debt freedom pack; current IDR rules in the registry | Rules changed in 2025 and 2026; every number must be re-sourced before porting. |
| 85 | Coach pack (view-only mode, coach export, notes) | 61 | new | medium | pack | Audience decision |  |
| 86 | Variable Income | 61 | new | medium | pack: Self-employed | Monthly cash model; the v2 model is annual | The buffer sizing is new; the annual model needs a monthly floor. |
| 87 | House hack calculator | 48 | new | medium | pack: Home (later) | Home pack; rental income stream | Waits on the Home pack's property bucket and the rental stream. |
| 88 | Skill calculator | 48 | new | medium | pack: Earn more (later) |  | A raise block prices the outcome; the skill side is content. |
| 89 | Housing Decision | 70 | new | large | pack: Home | Home pack: property bucket, sale event | Needs the home as an account. |
| 90 | Home pack (property bucket, sale event, rent versus buy) | 67 | new | large | pack |  |  |
| 91 | Self-employed pack (QBI, solo 401(k) room, S-corp salary, estimated taxes) | 65 | new | large | pack | Registry rules to verify |  |
| 92 | Family pack (dependents, credits, 529) | 61 | new | large | pack | Registry rules to verify |  |
| 93 | Aliyah Math (template for any country move) | 49 | new | large | pack: Move (abroad) | Move pack: FEIE, foreign tax placeholder | Needs the abroad block; the country template is content. |

## Coach pack

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 94 | Get Help | 66 | content | small | Coach pack and the About page |  | Content only; the attorney question applies. |
| 95 | Client Google Sheet workflow | 61 | content | small | Coach pack (export shape) | Coach pack export | The coach export replaces the sheet one column at a time. |
| 96 | Coach mode (client picker, read-only share link, monthly check-ins, comments) | 60 | new | large | Coach pack and coaching spec 11 | Audience decision; attorney question; a share link needs a server or a file | The share link conflicts with the no-server promise; the file path is specified. |

## data

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 97 | Modern Orthodox community life-planning tool (community preset set) | 62 | content | small | data: assumption and preset sets | Assumption sets exist; spending presets per community | A preset set is content; keep the engine neutral. |

## M7

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 98 | Cash flow Sankey with per-tag budgets | 51 | content | medium | M7 room (view) | Spending categories; per-tag budgets contradict decision 'one total' (advice line budgetCategories) | The Sankey view is cheap; per-tag budgets conflict with the one-total stance and go to the icebox. |
| 99 | M7 porting v1 rooms as views | 62 | content | large | M7 | This register | This register is the port plan. |
| 100 | Money Calendar and Pay-Later | 55 | new | medium | M7 room | Needs transaction-level dates the v2 model does not hold (annual rows only) | A cash-flow timing layer is new machinery; the v2 model is annual. |

## Level 5

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 101 | Estate Basics | 68 | content | small | Level 5 (built) |  | Built as the basics checklist and the estate view. |
| 102 | Giving | 66 | content | small | Level 5 (built) |  | Built. |

## entry screen

| # | Feature | Score | Port | Effort | Needs | Depends on | Note |
|---|---|---|---|---|---|---|---|
| 103 | Progressive disclosure via fold | 68 | content | small | entry screen (built as collapsible sections) |  | Built. |
| 104 | Save confirmation with undo | 67 | content | small | entry screen (partly built: import undo) |  | Import undo exists; field-level undo is small. |

## The sequence in one paragraph

First the things only Eli can give (the M2 workpaper, the hand tie-outs), the two unverified rules (the return series, spousal and survivor), and the small M3, M6, and households-of-two gaps, because every later feature stands on them. Then onboarding (the two-question and five-input openings are Level 1 reshaped) and the foundations (statement upload after the performance budget's worker and size check). Then the coaching loop in its own build order (coaching spec section 15). Then the packs by value against engine cost: Earn more and Debt freedom (no new engine), Health and Taxes (small engine pieces), Partner and Move, then Home, Family, and Self-employed (new buckets and rules), and Coach last, after the audience decision. The M7 room ports are views on all of that and go wherever their destination lands.
