# Feature register

**Status: Proposed, not reviewed by Eli.** Built 2026-10-04 during the overnight build on branch `feature-register`. Docs only. The data is `data/feature-register.json`; the plan is `implementation-plan.md`; the rest is `icebox.md`.

## How it was made

1. **Inventory.** Every room, tool, engine, game, and framework in the v1 repository (`Sapphirestoneage/Personalfinance`, cloned read-only at commit 5ff7fd9), every item in the build's minimum list, and every feature in this repo's docs that is not built yet (packs, the coaching spec, the foundation specs, the self-audits' open items). Bundles are split into their features. One row each.
2. **Score.** Six criteria, each with its own points, adding to 100: user value 30 (does a person in their 20s pursuing early retirement need it), fit 20 (reuses the v2 engine, levels, and data model), differentiation 15 (no mainstream tool does it well), effort inverse 15 (cheap scores high), trust 10 (can it be accurate, sourced, and educational), coaching 10 (credibility, onboarding, coach mode). The points for each criterion are shown.
3. **Decide.** Above 25: an implementation plan with a v2 destination, what it needs, content-only or new capability, dependencies, effort, and build order. 25 or below: the icebox with a reason and a revisit trigger.
4. **Correct.** Every financial claim in a ported feature is checked against `data/rules-registry.json`. The SPARKS luxury strategies catalog's failed claims are listed at the end.

Scores are one person's judgment on one night and are the thing to argue with first. The rank and quartile follow from them.

| Count | |
|---|---|
| Features | 123 |
| Above 25 (planned) | 104 |
| 25 or below (icebox) | 19 |
| Top quartile | 31 |

## The register, sorted by score

| Rank | Feature | Source | Value /30 | Fit /20 | Diff /15 | Effort /15 | Trust /10 | Coach /10 | Total | Top quartile | Decision | Destination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

| 1 | Decumulation (The Back Half) | v1 expansion room | 26 | 20 | 12 | 12 | 9 | 8 | **87** | yes | plan | M2 Level 4 (built) |
| 2 | Return on Hassle | framework | 22 | 20 | 11 | 14 | 9 | 8 | **84** | yes | plan | M3 next card (built as value per minute) |
| 3 | Two-question opening with immediate runway | v1 onboarding | 24 | 19 | 10 | 14 | 9 | 8 | **84** | yes | plan | onboarding |
| 4 | Five-input opening | v1 onboarding | 24 | 20 | 8 | 14 | 9 | 8 | **83** | yes | plan | onboarding (Level 1 is these five) |
| 5 | Readiness score | coaching spec 3 | 22 | 20 | 11 | 13 | 8 | 9 | **83** | yes | plan | coaching spec |
| 6 | Advice Translator | framework | 18 | 20 | 12 | 14 | 9 | 9 | **82** | yes | plan | M4 (built) |
| 7 | Between Jobs | v1 expansion room | 24 | 19 | 9 | 13 | 8 | 8 | **81** | yes | plan | Level 2 (built) |
| 8 | Quantum collapse onboarding module | v1 onboarding | 22 | 19 | 12 | 12 | 9 | 7 | **81** | yes | plan | Level 1 and the Sky (partly built: bands narrow with kinds) |
| 9 | Rule of 5 | framework | 20 | 20 | 9 | 15 | 9 | 8 | **81** | yes | plan | Level 2 (built) |
| 10 | Worth the Hassle (Return on Hassle) | v1 room / framework | 22 | 19 | 11 | 13 | 9 | 7 | **81** | yes | plan | M3 next card (built as value per minute) |
| 11 | DRAFTT | framework | 18 | 20 | 11 | 14 | 8 | 9 | **80** | yes | plan | M4 lens (built) |
| 12 | Earn more pack | docs/packs | 22 | 20 | 9 | 13 | 9 | 7 | **80** | yes | plan | pack |
| 13 | Partner (Family) | v1 expansion room | 24 | 19 | 10 | 12 | 8 | 7 | **80** | yes | plan | Households of two (built) and the Partner pack |
| 14 | Money phases | coaching spec 7 | 18 | 20 | 9 | 14 | 9 | 8 | **78** | yes | plan | coaching spec |
| 15 | Price the Dream | v1 room | 22 | 19 | 10 | 13 | 8 | 6 | **78** | yes | plan | M5 price card (built) |
| 16 | Rules update routine | docs/rules-update-routine.md | 20 | 20 | 8 | 13 | 10 | 7 | **78** | yes | plan | Upkeep |
| 17 | Sunday recap | coaching spec 8 | 20 | 19 | 9 | 13 | 8 | 9 | **78** | yes | plan | coaching spec |
| 18 | Guided programs (four drafted) | coaching spec 4 | 22 | 17 | 11 | 9 | 8 | 10 | **77** | yes | plan | coaching spec |
| 19 | Health pack (sourced placeholders, COBRA, long-term care, age curve) | docs/packs | 24 | 18 | 11 | 9 | 7 | 8 | **77** | yes | plan | pack |
| 20 | Weekly money rings | coaching spec 2 | 20 | 18 | 10 | 12 | 8 | 9 | **77** | yes | plan | coaching spec |
| 21 | Debt freedom pack (debt-free date, refinance block, IDR) | docs/packs | 22 | 19 | 8 | 11 | 8 | 8 | **76** | yes | plan | pack |
| 22 | FOO questionnaire (Financial Order of Operations) | v1 room | 24 | 18 | 6 | 12 | 8 | 8 | **76** | yes | plan | Level 1 and the waterfall (built) |
| 23 | Rest days (permission to spend) | coaching spec 9 | 18 | 19 | 12 | 12 | 8 | 7 | **76** | yes | plan | coaching spec |
| 24 | Tax | v1 expansion room | 22 | 18 | 10 | 10 | 9 | 7 | **76** | yes | plan | pack: Taxes |
| 25 | Verified return series for M6 | docs/m6-spec.md | 22 | 20 | 6 | 12 | 10 | 6 | **76** | yes | plan | M6 |
| 26 | Career Move | v1 expansion room | 22 | 18 | 8 | 12 | 8 | 7 | **75** | yes | plan | pack: Earn more |
| 27 | History | v1 expansion room | 18 | 20 | 7 | 14 | 9 | 7 | **75** | yes | plan | Foundations (built as progress history) |
| 28 | Real Hourly Wage | v1 room | 20 | 18 | 8 | 13 | 9 | 7 | **75** | yes | plan | M4 lens (built as the hours lens and ratio) |
| 29 | Simulation tool | v1 tool idea | 22 | 18 | 9 | 12 | 8 | 6 | **75** | yes | plan | M6 (built as backtests) |
| 30 | The two orders of operations (money and skill) | framework | 20 | 18 | 9 | 12 | 8 | 8 | **75** | yes | plan | Level 1 waterfall (money, built) and the Earn more pack (skill) |
| 31 | What It Takes | v1 room | 22 | 18 | 7 | 12 | 9 | 7 | **75** | yes | plan | M4 lens (simple math) |
| 32 | Zombie Apocalypse Theory of Savings | framework | 16 | 19 | 11 | 14 | 8 | 7 | **75** |  | plan | Level 2 (built as the zombie-readiness headline) |
| 33 | Can I? | v1 room | 24 | 16 | 9 | 10 | 8 | 7 | **74** |  | plan | M5 price card |
| 34 | Debt calculator | v1 tool idea | 20 | 20 | 5 | 14 | 9 | 6 | **74** |  | plan | M5 payoff (built) |
| 35 | Field-status ledger | v1 onboarding | 18 | 20 | 7 | 14 | 9 | 6 | **74** |  | plan | M3 Rough numbers card and the Sky (built) |
| 36 | Windfall and bonus room | v1 room | 20 | 19 | 7 | 13 | 9 | 6 | **74** |  | plan | M5 block (inheritance) plus the waterfall |
| 37 | Big Purchase | v1 expansion room | 20 | 19 | 7 | 13 | 8 | 6 | **73** |  | plan | M5 blocks and price card (built) |
| 38 | SWAN Number | framework | 18 | 18 | 9 | 12 | 8 | 8 | **73** |  | plan | Level 2 (the Rule of 5 and runway stack) |
| 39 | Short guided lessons | coaching spec 12 | 18 | 17 | 9 | 11 | 8 | 10 | **73** |  | plan | coaching spec |
| 40 | Timeline Comparator (three career paths) | v1 life | 20 | 18 | 9 | 11 | 8 | 7 | **73** |  | plan | M5 blocks (compare timings exists) |
| 41 | Hours back calculator | v1 tool idea | 18 | 18 | 9 | 13 | 8 | 6 | **72** |  | plan | M4 hours lens (built) |
| 42 | Tax efficiency ratio | v1 optimization | 16 | 20 | 7 | 14 | 9 | 6 | **72** |  | plan | M4 ratio (built) |
| 43 | Taxes pack (return view, itemizing, loss harvesting, state retirement rules) | docs/packs | 20 | 17 | 10 | 8 | 9 | 8 | **72** |  | plan | pack |
| 44 | Protection | v1 expansion room | 20 | 17 | 8 | 11 | 8 | 7 | **71** |  | plan | Level 2 (partly built: disability gap, term life range) |
| 45 | Verify the spousal and survivor rule | docs/household-two-spec.md | 18 | 20 | 5 | 12 | 10 | 6 | **71** |  | plan | Households of two |
| 46 | Your Shockingly Simple Math | v1 room | 20 | 18 | 5 | 13 | 9 | 6 | **71** |  | plan | M4 lens (built) |
| 47 | Convenience Method | framework | 16 | 17 | 9 | 13 | 8 | 7 | **70** |  | plan | M4 hours lens and small wins |
| 48 | FIRE Number and FIRE Lab | v1 room | 20 | 18 | 5 | 12 | 9 | 6 | **70** |  | plan | M4 4% lens and True FI (built) |
| 49 | First Financial Picture interview tree | v1 onboarding | 20 | 16 | 9 | 9 | 8 | 8 | **70** |  | plan | M3 guided mode |
| 50 | Housing Decision | v1 expansion room | 24 | 13 | 11 | 7 | 8 | 7 | **70** |  | plan | pack: Home |
| 51 | Personal records | coaching spec 6 | 16 | 18 | 8 | 13 | 8 | 7 | **70** |  | plan | coaching spec |
| 52 | Second Maya workpaper at M2 depth | docs/audits/m2-self-audit.md | 20 | 20 | 5 | 8 | 10 | 7 | **70** |  | plan | Math readiness |
| 53 | Annual tax planning checklist | v1 optimization | 18 | 16 | 6 | 12 | 9 | 8 | **69** |  | plan | pack: Taxes, and the coaching lessons |
| 54 | M3 gaps: rough-results label on the result screen; staleness widening in the ranking | docs/audits/m3-self-audit.md | 16 | 20 | 5 | 14 | 9 | 5 | **69** |  | plan | M3 |
| 55 | Estate Basics | v1 expansion room | 16 | 18 | 8 | 12 | 8 | 6 | **68** |  | plan | Level 5 (built) |
| 56 | Metrics-unlocked shelf | v1 game | 14 | 20 | 6 | 14 | 9 | 5 | **68** |  | plan | M4 ratio registry (built) |
| 57 | Progressive disclosure via fold | v1 onboarding | 16 | 20 | 4 | 14 | 9 | 5 | **68** |  | plan | entry screen (built as collapsible sections) |
| 58 | Worth It | v1 room | 18 | 17 | 8 | 12 | 8 | 5 | **68** |  | plan | M4 hours lens |
| 59 | Guardrails applied to the plan's own FI date | docs/audits/m6-self-audit.md | 14 | 20 | 7 | 13 | 8 | 5 | **67** |  | plan | M6 |
| 60 | Home pack (property bucket, sale event, rent versus buy) | docs/packs | 24 | 12 | 11 | 5 | 8 | 7 | **67** |  | plan | pack |
| 61 | SPARKS luxury strategies catalog (after correction) | v1 optimization | 20 | 16 | 10 | 9 | 5 | 7 | **67** |  | plan | M2 strategy list (built) with corrections |
| 62 | Save confirmation with undo | v1 onboarding | 16 | 19 | 5 | 13 | 9 | 5 | **67** |  | plan | entry screen (partly built: import undo) |
| 63 | Scenario-based learning (decision cases) | v1 learning | 16 | 15 | 9 | 10 | 8 | 9 | **67** |  | plan | coaching: lessons |
| 64 | The Long Way Round | v1 room | 18 | 17 | 8 | 11 | 8 | 5 | **67** |  | plan | M5 block (sabbatical, job change) |
| 65 | Adaptive plans (re-planning) | coaching spec 5 | 16 | 16 | 10 | 8 | 8 | 8 | **66** |  | plan | coaching spec |
| 66 | Get Help | v1 expansion room | 14 | 15 | 6 | 13 | 9 | 9 | **66** |  | plan | Coach pack and the About page |
| 67 | Giving | v1 expansion room | 14 | 18 | 9 | 12 | 8 | 5 | **66** |  | plan | Level 5 (built) |
| 68 | Move pack (dated state, places comparison, abroad) | docs/packs | 18 | 16 | 10 | 9 | 7 | 6 | **66** |  | plan | pack |
| 69 | Partner pack (two retirement dates, partner claiming knob, mortality) | docs/packs | 18 | 16 | 9 | 8 | 8 | 7 | **66** |  | plan | pack |
| 70 | Partner view on the result and levels screens | docs/audits/household-two-self-audit.md | 14 | 19 | 7 | 12 | 8 | 6 | **66** |  | plan | Households of two |
| 71 | Self-employed pack (QBI, solo 401(k) room, S-corp salary, estimated taxes) | docs/packs | 20 | 14 | 10 | 6 | 8 | 7 | **65** |  | plan | pack |
| 72 | Avalanche Generation | framework | 12 | 18 | 6 | 14 | 8 | 6 | **64** |  | plan | M5 payoff (avalanche built) |
| 73 | Kids and Tuition | v1 expansion room | 20 | 14 | 8 | 8 | 8 | 6 | **64** |  | plan | pack: Family |
| 74 | Performance budget (size check in CI, worker for long work) | docs/performance-budget.md | 18 | 18 | 5 | 10 | 9 | 4 | **64** |  | plan | Upkeep |
| 75 | Statement upload (browser-only, pattern table) | docs/statement-upload-spec.md | 22 | 12 | 10 | 5 | 7 | 7 | **63** |  | plan | Foundations |
| 76 | FI Address system | v1 identity | 12 | 16 | 9 | 12 | 7 | 6 | **62** |  | plan | coaching: money phases |
| 77 | M7 porting v1 rooms as views | docs/roadmap.md | 16 | 18 | 6 | 8 | 8 | 6 | **62** |  | plan | M7 |
| 78 | Modern Orthodox community life-planning tool (community preset set) | v1 life | 10 | 17 | 11 | 11 | 7 | 6 | **62** |  | plan | data: assumption and preset sets |
| 79 | Streaks with grace | coaching spec 13 | 10 | 18 | 7 | 13 | 8 | 6 | **62** |  | plan | coaching spec |
| 80 | Student Loan Decision | v1 room | 22 | 12 | 9 | 7 | 6 | 6 | **62** |  | plan | pack: Debt freedom |
| 81 | Client Google Sheet workflow | coaching | 14 | 14 | 5 | 11 | 7 | 10 | **61** |  | plan | Coach pack (export shape) |
| 82 | Coach pack (view-only mode, coach export, notes) | docs/packs | 14 | 14 | 9 | 8 | 6 | 10 | **61** |  | plan | pack |
| 83 | Family pack (dependents, credits, 529) | docs/packs | 20 | 13 | 8 | 6 | 8 | 6 | **61** |  | plan | pack |
| 84 | Variable Income | v1 expansion room | 20 | 11 | 10 | 7 | 7 | 6 | **61** |  | plan | pack: Self-employed |
| 85 | Backtests and the optimizer in a Web Worker | docs/performance-budget.md | 16 | 18 | 4 | 9 | 9 | 4 | **60** |  | plan | Upkeep |
| 86 | Coach mode (client picker, read-only share link, monthly check-ins, comments) | coaching | 16 | 12 | 10 | 6 | 6 | 10 | **60** |  | plan | Coach pack and coaching spec 11 |
| 87 | DRAFTT video series as lesson content | v1 learning | 12 | 14 | 8 | 10 | 7 | 9 | **60** |  | plan | coaching: lessons (DRAFTT lens is built) |
| 88 | Level gaps: hand-computed milestone household; hand-checked estate; Hamilton theming | docs/audits/levels-self-audit.md | 12 | 18 | 4 | 11 | 10 | 5 | **60** |  | plan | Levels |
| 89 | Time Buckets | v1 room | 16 | 12 | 11 | 8 | 7 | 5 | **59** |  | plan | M5 dreams (timing curve) |
| 90 | Coach mode (weekly loop with a coach) | coaching spec 11 | 14 | 12 | 10 | 6 | 6 | 10 | **58** |  | plan | coaching spec |
| 91 | FI-losophy | framework | 10 | 12 | 8 | 11 | 7 | 8 | **56** |  | plan | coaching: lessons |
| 92 | PDF spend tracking with auto-categorization | v1 business | 20 | 10 | 9 | 5 | 6 | 6 | **56** |  | plan | Foundations spec: statement upload |
| 93 | SPARKS tradeoff matrix (13 life metrics, lever cards, constraint mode, Pareto frontier, story mode) | v1 optimization | 16 | 12 | 12 | 4 | 6 | 6 | **56** |  | plan | M2 optimizer (objectives and limits exist) |
| 94 | Money Calendar and Pay-Later | v1 room | 18 | 8 | 10 | 6 | 8 | 5 | **55** |  | plan | M7 room |
| 95 | Second Mouse | framework | 10 | 10 | 8 | 12 | 7 | 6 | **53** |  | plan | coaching: lessons |
| 96 | FAT | framework | 10 | 12 | 7 | 11 | 6 | 6 | **52** |  | plan | coaching: lessons |
| 97 | Cash flow Sankey with per-tag budgets | v1 room | 16 | 10 | 7 | 6 | 8 | 4 | **51** |  | plan | M7 room (view) |
| 98 | Credit card benefits calculator | v1 tool idea | 12 | 12 | 6 | 11 | 7 | 3 | **51** |  | plan | M3 small wins (rewards.card exists) |
| 99 | Insights from tags | coaching spec 10 | 10 | 12 | 9 | 8 | 6 | 6 | **51** |  | plan | coaching spec |
| 100 | Triple D plan | framework | 10 | 12 | 6 | 11 | 6 | 6 | **51** |  | plan | coaching: programs |
| 101 | Aliyah Math (template for any country move) | v1 life | 12 | 10 | 12 | 5 | 5 | 5 | **49** |  | plan | pack: Move (abroad) |
| 102 | House hack calculator | v1 tool | 14 | 9 | 9 | 6 | 6 | 4 | **48** |  | plan | pack: Home (later) |
| 103 | Skill calculator | v1 tool idea | 12 | 10 | 8 | 8 | 6 | 4 | **48** |  | plan | pack: Earn more (later) |
| 104 | FI Skill Tree (25 trees, Calculator Lab, 18 dialects, daily layer, skill stacker) | v1 game | 12 | 10 | 10 | 4 | 6 | 5 | **47** |  | plan | M3 levels and tiers (the tier format is kept) |
| 105 | Government benefits calculator | v1 tool idea | 9 | 5 | 5 | 2 | 2 | 2 | **25** |  | icebox | icebox |
| 106 | Budgeting tool | v1 tool idea | 8 | 3 | 1 | 5 | 5 | 2 | **24** |  | icebox | icebox |
| 107 | Designed Week | v1 room | 6 | 3 | 4 | 5 | 4 | 2 | **24** |  | icebox | icebox |
| 108 | Roots-trunk-branches tree map | v1 game | 5 | 5 | 4 | 5 | 3 | 2 | **24** |  | icebox | icebox |
| 109 | Memory dividends calculator | v1 tool idea | 5 | 3 | 5 | 5 | 2 | 2 | **22** |  | icebox | icebox |
| 110 | Financial personality quiz (five elements, 20 traits) | v1 identity | 5 | 2 | 4 | 4 | 2 | 4 | **21** |  | icebox | icebox |
| 111 | Future-self connector (goals over an aspirational board) | v1 life | 4 | 3 | 3 | 5 | 3 | 3 | **21** |  | icebox | icebox |
| 112 | Dungeons & Dividends (stats, HP, classes, debt as status, monsters, IRS faction, DM mode) | v1 game | 5 | 2 | 7 | 1 | 2 | 3 | **20** |  | icebox | icebox |
| 113 | Ledgerfell (life-sim game) | v1 game | 5 | 3 | 6 | 1 | 2 | 2 | **19** |  | icebox | icebox |
| 114 | The six planets with moons | v1 game | 3 | 4 | 2 | 6 | 3 | 1 | **19** |  | icebox | icebox |
| 115 | Community money date | v1 community | 4 | 2 | 4 | 2 | 2 | 4 | **18** |  | icebox | icebox |
| 116 | Purpose and happiness calculator | v1 tool idea | 4 | 2 | 3 | 5 | 2 | 2 | **18** |  | icebox | icebox |
| 117 | Civ-style tech-tree board with fog and warp shortcuts | v1 game | 4 | 3 | 5 | 2 | 2 | 1 | **17** |  | icebox | icebox |
| 118 | Money Mirror (financial Enneagram) | v1 identity | 4 | 1 | 3 | 4 | 2 | 3 | **17** |  | icebox | icebox |
| 119 | FI Pathway ski mountain (nine lodges, 625 skills) | v1 game | 4 | 2 | 5 | 1 | 2 | 2 | **16** |  | icebox | icebox |
| 120 | SLAM Profit Engine (Hormozi-based pricing and offers) | v1 business | 3 | 1 | 4 | 2 | 2 | 4 | **16** |  | icebox | icebox |
| 121 | Pokémon-style type-chart loop | v1 game | 2 | 1 | 4 | 4 | 2 | 1 | **14** |  | icebox | icebox |
| 122 | The nine Dante spheres | v1 game | 2 | 1 | 4 | 4 | 2 | 1 | **14** |  | icebox | icebox |
| 123 | Travel rewards | v1 learning | 3 | 2 | 1 | 5 | 2 | 1 | **14** |  | icebox | icebox |

## Claims that failed verification

See `implementation-plan.md`.
