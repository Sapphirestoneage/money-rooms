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
| Features | 244 |
| Above 25 (planned) | 224 |
| 25 or below (icebox) | 20 |
| Top quartile | 61 |

## The register, sorted by score

| Rank | Feature | Source | Value /30 | Fit /20 | Diff /15 | Effort /15 | Trust /10 | Coach /10 | Total | Top quartile | Decision | Destination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

| 1 | Decumulation (The Back Half) | v1 expansion room | 26 | 20 | 12 | 12 | 9 | 8 | **87** | yes | plan | M2 Level 4 (built) |
| 2 | Return on Hassle | framework | 22 | 20 | 11 | 14 | 9 | 8 | **84** | yes | plan | M3 next card (built as value per minute) |
| 3 | Round 1 opening (five questions: take-home, FI band, coast date, ranked levers) | v1 inventory | 24 | 20 | 9 | 14 | 9 | 8 | **84** | yes | plan | onboarding (Level 1) |
| 4 | Two-question opening with immediate runway | v1 onboarding | 24 | 19 | 10 | 14 | 9 | 8 | **84** | yes | plan | onboarding |
| 5 | Five-input opening | v1 onboarding | 24 | 20 | 8 | 14 | 9 | 8 | **83** | yes | plan | onboarding (Level 1 is these five) |
| 6 | Readiness score | coaching spec 3 | 22 | 20 | 11 | 13 | 8 | 9 | **83** | yes | plan | coaching spec |
| 7 | Roth conversions versus ACA (the price of cover, cliff on and off) | v1 inventory | 22 | 20 | 12 | 13 | 9 | 7 | **83** | yes | plan | M2 optimizer (built: acaTarget knob and MAGI budget) |
| 8 | Advice Translator | framework | 18 | 20 | 12 | 14 | 9 | 9 | **82** | yes | plan | M4 (built) |
| 9 | Cost of not knowing (what a missing number costs in FI date, runway, net worth) | v1 inventory | 22 | 20 | 11 | 13 | 9 | 7 | **82** | yes | plan | M3 materiality (built as the plausible range per input) |
| 10 | Between Jobs | v1 expansion room | 24 | 19 | 9 | 13 | 8 | 8 | **81** | yes | plan | Level 2 (built) |
| 11 | Quantum collapse onboarding module | v1 onboarding | 22 | 19 | 12 | 12 | 9 | 7 | **81** | yes | plan | Level 1 and the Sky (partly built: bands narrow with kinds) |
| 12 | Rule of 5 | framework | 20 | 20 | 9 | 15 | 9 | 8 | **81** | yes | plan | Level 2 (built) |
| 13 | Worth the Hassle (Return on Hassle) | v1 room / framework | 22 | 19 | 11 | 13 | 9 | 7 | **81** | yes | plan | M3 next card (built as value per minute) |
| 14 | DRAFTT | framework | 18 | 20 | 11 | 14 | 8 | 9 | **80** | yes | plan | M4 lens (built) |
| 15 | Earn more pack | docs/packs | 22 | 20 | 9 | 13 | 9 | 7 | **80** | yes | plan | pack |
| 16 | Partner (Family) | v1 expansion room | 24 | 19 | 10 | 12 | 8 | 7 | **80** | yes | plan | Households of two (built) and the Partner pack |
| 17 | Middle Class Trap test (wealth locked until 59 and a half, the paths through) | v1 inventory | 20 | 20 | 10 | 13 | 9 | 7 | **79** | yes | plan | M2 Level 4 (built) and a lens |
| 18 | The Bridge (what reaches before 59 and a half) | v1 inventory | 20 | 20 | 10 | 13 | 9 | 7 | **79** | yes | plan | M2 Level 4 (built: Roth basis, taxable, 72(t), rule of 55) |
| 19 | Money phases | coaching spec 7 | 18 | 20 | 9 | 14 | 9 | 8 | **78** | yes | plan | coaching spec |
| 20 | Price the Dream | v1 room | 22 | 19 | 10 | 13 | 8 | 6 | **78** | yes | plan | M5 price card (built) |
| 21 | Rules update routine | docs/rules-update-routine.md | 20 | 20 | 8 | 13 | 10 | 7 | **78** | yes | plan | Upkeep |
| 22 | Show the math | v1 inventory | 20 | 20 | 7 | 14 | 10 | 7 | **78** | yes | plan | trace drawer (built) |
| 23 | Sunday recap | coaching spec 8 | 20 | 19 | 9 | 13 | 8 | 9 | **78** | yes | plan | coaching spec |
| 24 | Band 1 Sketch help (18 questions, where to look, a defensible start, I am not sure) | v1 inventory | 20 | 20 | 7 | 13 | 9 | 8 | **77** | yes | plan | entry help text |
| 25 | Guided programs (four drafted) | coaching spec 4 | 22 | 17 | 11 | 9 | 8 | 10 | **77** | yes | plan | coaching spec |
| 26 | Health pack (sourced placeholders, COBRA, long-term care, age curve) | docs/packs | 24 | 18 | 11 | 9 | 7 | 8 | **77** | yes | plan | pack |
| 27 | Weekly money rings | coaching spec 2 | 20 | 18 | 10 | 12 | 8 | 9 | **77** | yes | plan | coaching spec |
| 28 | What If life-event templates (ten, each in three bands) | v1 inventory | 20 | 20 | 8 | 14 | 8 | 7 | **77** | yes | plan | M5 blocks (built, ten kinds) |
| 29 | After-tax net worth (deferred tax on pretax accounts) | v1 inventory | 18 | 20 | 9 | 14 | 9 | 6 | **76** | yes | plan | Level 5 estate view (built as estate after heirs' taxes) |
| 30 | Debt freedom pack (debt-free date, refinance block, IDR) | docs/packs | 22 | 19 | 8 | 11 | 8 | 8 | **76** | yes | plan | pack |
| 31 | FOO questionnaire (Financial Order of Operations) | v1 room | 24 | 18 | 6 | 12 | 8 | 8 | **76** | yes | plan | Level 1 and the waterfall (built) |
| 32 | Quick wins (a 15-minute move with a dollar figure ending every session) | v1 inventory | 18 | 20 | 8 | 14 | 8 | 8 | **76** | yes | plan | M3 small wins (built) |
| 33 | Rest days (permission to spend) | coaching spec 9 | 18 | 19 | 12 | 12 | 8 | 7 | **76** | yes | plan | coaching spec |
| 34 | Tax | v1 expansion room | 22 | 18 | 10 | 10 | 9 | 7 | **76** | yes | plan | pack: Taxes |
| 35 | The Ledger (97 rows of three kinds) | v1 inventory | 20 | 20 | 7 | 14 | 9 | 6 | **76** | yes | plan | entry screen and the dictionary (built) |
| 36 | Verified return series for M6 | docs/m6-spec.md | 22 | 20 | 6 | 12 | 10 | 6 | **76** | yes | plan | M6 |
| 37 | Career Move | v1 expansion room | 22 | 18 | 8 | 12 | 8 | 7 | **75** | yes | plan | pack: Earn more |
| 38 | History | v1 expansion room | 18 | 20 | 7 | 14 | 9 | 7 | **75** | yes | plan | Foundations (built as progress history) |
| 39 | Real Hourly Wage | v1 room | 20 | 18 | 8 | 13 | 9 | 7 | **75** | yes | plan | M4 lens (built as the hours lens and ratio) |
| 40 | Simulation tool | v1 tool idea | 22 | 18 | 9 | 12 | 8 | 6 | **75** | yes | plan | M6 (built as backtests) |
| 41 | The two orders of operations (money and skill) | framework | 20 | 18 | 9 | 12 | 8 | 8 | **75** | yes | plan | Level 1 waterfall (money, built) and the Earn more pack (skill) |
| 42 | What It Takes | v1 room | 22 | 18 | 7 | 12 | 9 | 7 | **75** | yes | plan | M4 lens (simple math) |
| 43 | Zombie Apocalypse Theory of Savings | framework | 16 | 19 | 11 | 14 | 8 | 7 | **75** | yes | plan | Level 2 (built as the zombie-readiness headline) |
| 44 | Can I? | v1 room | 24 | 16 | 9 | 10 | 8 | 7 | **74** | yes | plan | M5 price card |
| 45 | Debt calculator | v1 tool idea | 20 | 20 | 5 | 14 | 9 | 6 | **74** | yes | plan | M5 payoff (built) |
| 46 | Descent (one number buys one true sentence: $2,500 a month means $750,000) | v1 inventory | 16 | 19 | 10 | 14 | 8 | 7 | **74** | yes | plan | onboarding (the first sentence) |
| 47 | Field-status ledger | v1 onboarding | 18 | 20 | 7 | 14 | 9 | 6 | **74** | yes | plan | M3 Rough numbers card and the Sky (built) |
| 48 | Lens toggle (dollars, hours of life, months of FI) | v1 inventory | 18 | 19 | 10 | 13 | 8 | 6 | **74** | yes | plan | M4 hours lens; a global toggle is new display |
| 49 | Since last time (what moved; earned versus learned) | v1 inventory | 18 | 20 | 8 | 13 | 8 | 7 | **74** | yes | plan | M3 Refresh card and progress history (built) |
| 50 | Social Security estimate from income and claiming age | v1 inventory | 20 | 20 | 5 | 14 | 9 | 6 | **74** | yes | plan | engine (built, with the earnings record) |
| 51 | The Referee (nine debates with both sides on your numbers) | v1 inventory | 18 | 17 | 11 | 11 | 8 | 9 | **74** | yes | plan | M4 Advice Translator and lenses (built in part) |
| 52 | The next $100 ranked | v1 inventory | 18 | 20 | 7 | 14 | 8 | 7 | **74** | yes | plan | Level 1 waterfall (built) |
| 53 | Which Account (Roth versus traditional versus taxable on equal pre-tax cost) | v1 inventory | 20 | 19 | 7 | 12 | 9 | 7 | **74** | yes | plan | M2 contribution-type knob and M4 lens (built) |
| 54 | Windfall and bonus room | v1 room | 20 | 19 | 7 | 13 | 9 | 6 | **74** | yes | plan | M5 block (inheritance) plus the waterfall |
| 55 | Big Purchase | v1 expansion room | 20 | 19 | 7 | 13 | 8 | 6 | **73** | yes | plan | M5 blocks and price card (built) |
| 56 | SWAN Number | framework | 18 | 18 | 9 | 12 | 8 | 8 | **73** | yes | plan | Level 2 (the Rule of 5 and runway stack) |
| 57 | Short guided lessons | coaching spec 12 | 18 | 17 | 9 | 11 | 8 | 10 | **73** | yes | plan | coaching spec |
| 58 | Suggestions (derived values proposed, never stored until confirmed) | v1 inventory | 18 | 20 | 7 | 13 | 9 | 6 | **73** | yes | plan | entry presets (built as preset values marked roughly) |
| 59 | The Documents (income statement, cash flow, balance sheet, FIRE statement) | v1 inventory | 16 | 20 | 9 | 12 | 9 | 7 | **73** | yes | plan | M7 view over the timeline |
| 60 | Timeline Comparator (three career paths) | v1 life | 20 | 18 | 9 | 11 | 8 | 7 | **73** | yes | plan | M5 blocks (compare timings exists) |
| 61 | Walk-Through (five stages, 15 to 20 steps) | v1 inventory | 20 | 17 | 8 | 11 | 8 | 9 | **73** | yes | plan | coaching: programs |
| 62 | When It Won't All Get Paid (bill triage in three tiers, calls worth making, free help) | v1 inventory | 18 | 16 | 11 | 12 | 8 | 8 | **73** |  | plan | Level 2 staircase (built) plus content |
| 63 | 3D toggle (dream, default, disaster) | v1 inventory | 18 | 19 | 8 | 13 | 8 | 6 | **72** |  | plan | Bands (built: best, likely, worst) |
| 64 | Enough (what you would live on by choice; a second FI number) | v1 inventory | 16 | 19 | 9 | 13 | 8 | 7 | **72** |  | plan | Level 5 freedom budget and spending phases (built in parts) |
| 65 | FIRE variants (standard, lean, chubby, fat, coast, barista) | v1 inventory | 18 | 20 | 6 | 14 | 8 | 6 | **72** |  | plan | Level 3 milestones (built) |
| 66 | Goal templates (14: wedding, deposit, trip, fertility, surgery, funeral, business...) | v1 inventory | 18 | 20 | 6 | 14 | 8 | 6 | **72** |  | plan | M5 goals (built) plus templates |
| 67 | Hours back calculator | v1 tool idea | 18 | 18 | 9 | 13 | 8 | 6 | **72** |  | plan | M4 hours lens (built) |
| 68 | Ownership chips (one owner room per number) | v1 inventory | 16 | 20 | 7 | 14 | 10 | 5 | **72** |  | plan | Data dictionary rule (built: one store per fact, as-of on every value) |
| 69 | Quit fund (months of freedom by choice; start a business) | v1 inventory | 16 | 20 | 8 | 13 | 8 | 7 | **72** |  | plan | Level 3 walk-away money and start a business (built) |
| 70 | Tax efficiency ratio | v1 optimization | 16 | 20 | 7 | 14 | 9 | 6 | **72** |  | plan | M4 ratio (built) |
| 71 | Taxes pack (return view, itemizing, loss harvesting, state retirement rules) | docs/packs | 20 | 17 | 10 | 8 | 9 | 8 | **72** |  | plan | pack |
| 72 | The Dashboard (where you are, next dollar, next lesson, FI range) | v1 inventory | 20 | 19 | 6 | 12 | 8 | 7 | **72** |  | plan | M3 What's next (built as the next card and level progress) |
| 73 | The Scorecard: nine numbers | v1 inventory | 18 | 20 | 5 | 14 | 8 | 7 | **72** |  | plan | M4 ratio registry (built) |
| 74 | Worst plausible year | v1 inventory | 16 | 20 | 8 | 14 | 8 | 6 | **72** |  | plan | Level 2 shock tests (built) |
| 75 | Inline ask (one blank row at the moment it is needed) | v1 inventory | 18 | 19 | 7 | 13 | 8 | 6 | **71** |  | plan | M3 next card and the unlock lists (built) |
| 76 | Offer Compare (two to four offers side by side) | v1 inventory | 18 | 18 | 8 | 12 | 8 | 7 | **71** |  | plan | pack: Earn more |
| 77 | Protection | v1 expansion room | 20 | 17 | 8 | 11 | 8 | 7 | **71** |  | plan | Level 2 (partly built: disability gap, term life range) |
| 78 | Reversibility (what a decision costs to undo, 15 decisions) | v1 inventory | 16 | 16 | 11 | 12 | 8 | 8 | **71** |  | plan | M5 price card and the decisions log's own vocabulary |
| 79 | Verify the spousal and survivor rule | docs/household-two-spec.md | 18 | 20 | 5 | 12 | 10 | 6 | **71** |  | plan | Households of two |
| 80 | Your Data (save or load, paste statement lines sorted, CSV round trip, start over) | v1 inventory | 18 | 20 | 5 | 14 | 9 | 5 | **71** |  | plan | transfer card and Privacy page (built) |
| 81 | Your Shockingly Simple Math | v1 room | 20 | 18 | 5 | 13 | 9 | 6 | **71** |  | plan | M4 lens (built) |
| 82 | Convenience Method | framework | 16 | 17 | 9 | 13 | 8 | 7 | **70** |  | plan | M4 hours lens and small wins |
| 83 | FIRE Number and FIRE Lab | v1 room | 20 | 18 | 5 | 12 | 9 | 6 | **70** |  | plan | M4 4% lens and True FI (built) |
| 84 | First Financial Picture interview tree | v1 onboarding | 20 | 16 | 9 | 9 | 8 | 8 | **70** |  | plan | M3 guided mode |
| 85 | Housing Decision | v1 expansion room | 24 | 13 | 11 | 7 | 8 | 7 | **70** |  | plan | pack: Home |
| 86 | Personal records | coaching spec 6 | 16 | 18 | 8 | 13 | 8 | 7 | **70** |  | plan | coaching spec |
| 87 | Second Maya workpaper at M2 depth | docs/audits/m2-self-audit.md | 20 | 20 | 5 | 8 | 10 | 7 | **70** |  | plan | Math readiness |
| 88 | Staleness ages (amber after 21 days) | v1 inventory | 16 | 20 | 6 | 14 | 9 | 5 | **70** |  | plan | M3 staleness clocks (built) |
| 89 | Unlearning quiz (12 rules: still applies, not yet, outgrown) | v1 inventory | 14 | 19 | 8 | 13 | 8 | 8 | **70** |  | plan | M4 Advice Translator (built with ten lines) |
| 90 | W-2 versus 1099 and the contract rate (quarterly estimates with safe harbor) | v1 inventory | 18 | 17 | 9 | 11 | 8 | 7 | **70** |  | plan | pack: Self-employed |
| 91 | Annual tax planning checklist | v1 optimization | 18 | 16 | 6 | 12 | 9 | 8 | **69** |  | plan | pack: Taxes, and the coaching lessons |
| 92 | Costs of earning income (deductible costs on a 1099 source) | v1 inventory | 16 | 20 | 5 | 14 | 9 | 5 | **69** |  | plan | income stream businessExpensesAnnual (built) |
| 93 | Coverage checkup (out-of-pocket max, term life, disability, umbrella) | v1 inventory | 18 | 18 | 7 | 11 | 8 | 7 | **69** |  | plan | Level 2 (partly built) |
| 94 | Demo persona (try with example numbers) | v1 inventory | 16 | 20 | 4 | 14 | 9 | 6 | **69** |  | plan | entry (built: Maya, Jordan, Dev examples) |
| 95 | FIRE tiers and the age milestone ladder (50, 55, 59.5, 62, 65, 67, 70, 73) | v1 inventory | 16 | 20 | 5 | 14 | 9 | 5 | **69** |  | plan | engine ages (built: every one is a rule) |
| 96 | M3 gaps: rough-results label on the result screen; staleness widening in the ranking | docs/audits/m3-self-audit.md | 16 | 20 | 5 | 14 | 9 | 5 | **69** |  | plan | M3 |
| 97 | Privacy receipt (counts requests to other origins) | v1 inventory | 14 | 18 | 9 | 13 | 10 | 5 | **69** |  | plan | Privacy page |
| 98 | Ratio explainers (what, why, what moves it, for 47 ratios) | v1 inventory | 16 | 19 | 6 | 12 | 8 | 8 | **69** |  | plan | M4 ratio registry (13 ratios built with formulas) |
| 99 | Retire or coast event (VPW, Social Security, health to 65) | v1 inventory | 18 | 18 | 8 | 11 | 8 | 6 | **69** |  | plan | M2 Level 4 and M6 guardrails (built); VPW is new |
| 100 | Estate Basics | v1 expansion room | 16 | 18 | 8 | 12 | 8 | 6 | **68** |  | plan | Level 5 (built) |
| 101 | Lane 2 sourced tables (2025 and 2026 limits, brackets, ACA, student loans) | v1 inventory | 16 | 20 | 4 | 13 | 10 | 5 | **68** |  | plan | data: rules registry (built; cross-check the two) |
| 102 | Left Behind (four options for an old 401(k), cost of cashing out) | v1 inventory | 16 | 17 | 8 | 12 | 9 | 6 | **68** |  | plan | M2 strategies (rule of 55 reads the plan) and a lesson |
| 103 | Metrics-unlocked shelf | v1 game | 14 | 20 | 6 | 14 | 9 | 5 | **68** |  | plan | M4 ratio registry (built) |
| 104 | Micro-retirement (a planned break with career momentum) | v1 inventory | 16 | 18 | 9 | 12 | 7 | 6 | **68** |  | plan | M5 sabbatical block (built) plus a momentum factor |
| 105 | Progressive disclosure via fold | v1 onboarding | 16 | 20 | 4 | 14 | 9 | 5 | **68** |  | plan | entry screen (built as collapsible sections) |
| 106 | Situation gate (folds what does not apply and says why) | v1 inventory | 16 | 19 | 6 | 13 | 8 | 6 | **68** |  | plan | M3 items (built as placeholders and notForMe) |
| 107 | The Statement (net worth, pay still to come, where the next dollar lands) | v1 inventory | 16 | 18 | 8 | 12 | 8 | 6 | **68** |  | plan | M4 ratios and Level 5 (built in parts) |
| 108 | What comes next (future income as dated periods, gaps and overlaps) | v1 inventory | 16 | 19 | 7 | 13 | 8 | 5 | **68** |  | plan | income streams with starts and ends (built) |
| 109 | Worth It | v1 room | 18 | 17 | 8 | 12 | 8 | 5 | **68** |  | plan | M4 hours lens |
| 110 | Guardrails applied to the plan's own FI date | docs/audits/m6-self-audit.md | 14 | 20 | 7 | 13 | 8 | 5 | **67** |  | plan | M6 |
| 111 | Home pack (property bucket, sale event, rent versus buy) | docs/packs | 24 | 12 | 11 | 5 | 8 | 7 | **67** |  | plan | pack |
| 112 | Money Wrapped (the year in review) | v1 inventory | 14 | 18 | 8 | 12 | 8 | 7 | **67** |  | plan | coaching: recap (yearly) |
| 113 | Out-of-bounds flags (five flags in ladder order) | v1 inventory | 16 | 19 | 5 | 13 | 8 | 6 | **67** |  | plan | M3 next card and ratios bands (built) |
| 114 | Quick Math (HYSA switch, cost per use, 20/3/8, $30k/$90k habit) | v1 inventory | 16 | 18 | 6 | 13 | 8 | 6 | **67** |  | plan | M3 small wins and M4 lenses |
| 115 | Race to $100K (rungs to $1M) | v1 inventory | 14 | 19 | 6 | 14 | 8 | 6 | **67** |  | plan | coaching: records (round-number milestones) |
| 116 | Reasons to keep a debt and the hold-back toggle | v1 inventory | 14 | 18 | 8 | 13 | 8 | 6 | **67** |  | plan | M5 payoff |
| 117 | SPARKS luxury strategies catalog (after correction) | v1 optimization | 20 | 16 | 10 | 9 | 5 | 7 | **67** |  | plan | M2 strategy list (built) with corrections |
| 118 | Save confirmation with undo | v1 onboarding | 16 | 19 | 5 | 13 | 9 | 5 | **67** |  | plan | entry screen (partly built: import undo) |
| 119 | Scenario-based learning (decision cases) | v1 learning | 16 | 15 | 9 | 10 | 8 | 9 | **67** |  | plan | coaching: lessons |
| 120 | Sealed backup (AES-256-GCM with a passphrase) | v1 inventory | 16 | 18 | 8 | 11 | 9 | 5 | **67** |  | plan | Foundations (export) |
| 121 | The Long Way Round | v1 room | 18 | 17 | 8 | 11 | 8 | 5 | **67** |  | plan | M5 block (sabbatical, job change) |
| 122 | The Sun (on route, or what would you change?) | v1 inventory | 14 | 18 | 8 | 12 | 8 | 7 | **67** |  | plan | M5 blocks |
| 123 | Adaptive plans (re-planning) | coaching spec 5 | 16 | 16 | 10 | 8 | 8 | 8 | **66** |  | plan | coaching spec |
| 124 | Coach recap (snapshot diff in plain words, print to PDF) | v1 inventory | 12 | 18 | 7 | 12 | 7 | 10 | **66** |  | plan | progress history trend sentence (built) plus print |
| 125 | Get Help | v1 expansion room | 14 | 15 | 6 | 13 | 9 | 9 | **66** |  | plan | Coach pack and the About page |
| 126 | Giving | v1 expansion room | 14 | 18 | 9 | 12 | 8 | 5 | **66** |  | plan | Level 5 (built) |
| 127 | Lenses (34 rules of thumb in 7 domains) | v1 inventory | 16 | 18 | 7 | 10 | 7 | 8 | **66** |  | plan | M4 lenses (five built) |
| 128 | Move pack (dated state, places comparison, abroad) | docs/packs | 18 | 16 | 10 | 9 | 7 | 6 | **66** |  | plan | pack |
| 129 | Partner pack (two retirement dates, partner claiming knob, mortality) | docs/packs | 18 | 16 | 9 | 8 | 8 | 7 | **66** |  | plan | pack |
| 130 | Partner view on the result and levels screens | docs/audits/household-two-self-audit.md | 14 | 19 | 7 | 12 | 8 | 6 | **66** |  | plan | Households of two |
| 131 | Down Payment Countdown (four ways in and when you get there) | v1 inventory | 16 | 17 | 7 | 11 | 8 | 6 | **65** |  | plan | pack: Home and M5 goals |
| 132 | Dreamline (dreams priced a month, the target monthly income, the hours) | v1 inventory | 14 | 18 | 7 | 13 | 7 | 6 | **65** |  | plan | M5 price card (built) |
| 133 | Exercise library (65 exercises: computed runs, canon, 15-minute tasks) | v1 inventory | 16 | 16 | 7 | 10 | 7 | 9 | **65** |  | plan | coaching: lessons and small wins |
| 134 | Moons and moves (17 strategy tracks, 98 moves unlocked by the numbers) | v1 inventory | 18 | 16 | 9 | 7 | 7 | 8 | **65** |  | plan | M3 small wins and M2 strategies (built); the rest as programs |
| 135 | Quick entry shorthand (car 450/mo 5.9% 38 left) | v1 inventory | 14 | 16 | 9 | 11 | 7 | 8 | **65** |  | plan | entry: paste mode (built as the template paste) |
| 136 | Self-employed pack (QBI, solo 401(k) room, S-corp salary, estimated taxes) | docs/packs | 20 | 14 | 10 | 6 | 8 | 7 | **65** |  | plan | pack |
| 137 | Variable percentage withdrawal | v1 inventory | 14 | 19 | 7 | 12 | 8 | 5 | **65** |  | plan | M6 spending adjuster |
| 138 | Avalanche Generation | framework | 12 | 18 | 6 | 14 | 8 | 6 | **64** |  | plan | M5 payoff (avalanche built) |
| 139 | Expenses as FAT and wants with a therapy line | v1 inventory | 14 | 17 | 7 | 12 | 8 | 6 | **64** |  | plan | spending categories (built; DRAFTT lens) |
| 140 | Hybrid payoff order (quick wins under $1,000, then avalanche) | v1 inventory | 12 | 20 | 5 | 14 | 8 | 5 | **64** |  | plan | M5 payoff (three methods built) |
| 141 | Journey map (four routes: as-is, scenic, death march, coast then cruise) | v1 inventory | 16 | 15 | 10 | 9 | 7 | 7 | **64** |  | plan | Level 3 spectrum and M5 blocks |
| 142 | Kids and Tuition | v1 expansion room | 20 | 14 | 8 | 8 | 8 | 6 | **64** |  | plan | pack: Family |
| 143 | Performance budget (size check in CI, worker for long work) | docs/performance-budget.md | 18 | 18 | 5 | 10 | 9 | 4 | **64** |  | plan | Upkeep |
| 144 | The Rerank (cost order against value order, cut and keep lines) | v1 inventory | 14 | 16 | 9 | 12 | 7 | 6 | **64** |  | plan | M3 small wins and the price card |
| 145 | FIRE Lab sensitivity grid (4x5) | v1 inventory | 14 | 18 | 6 | 12 | 8 | 5 | **63** |  | plan | M4 4% lens |
| 146 | Statement upload (browser-only, pattern table) | docs/statement-upload-spec.md | 22 | 12 | 10 | 5 | 7 | 7 | **63** |  | plan | Foundations |
| 147 | FI Address system | v1 identity | 12 | 16 | 9 | 12 | 7 | 6 | **62** |  | plan | coaching: money phases |
| 148 | Family: shared month split (equal, proportional, pooled) | v1 inventory | 14 | 15 | 8 | 11 | 8 | 6 | **62** |  | plan | pack: Partner |
| 149 | Lever library (six levers plus earn $500 more, hours a week each) | v1 inventory | 14 | 17 | 6 | 12 | 6 | 7 | **62** |  | plan | M5 blocks (data unverified in v1) |
| 150 | M7 porting v1 rooms as views | docs/roadmap.md | 16 | 18 | 6 | 8 | 8 | 6 | **62** |  | plan | M7 |
| 151 | Modern Orthodox community life-planning tool (community preset set) | v1 life | 10 | 17 | 11 | 11 | 7 | 6 | **62** |  | plan | data: assumption and preset sets |
| 152 | Streaks with grace | coaching spec 13 | 10 | 18 | 7 | 13 | 8 | 6 | **62** |  | plan | coaching spec |
| 153 | Student Loan Decision | v1 room | 22 | 12 | 9 | 7 | 6 | 6 | **62** |  | plan | pack: Debt freedom |
| 154 | Wheels (20/3/8, new versus used, depreciation, lease versus buy) | v1 inventory | 16 | 17 | 7 | 10 | 7 | 5 | **62** |  | plan | M5 car block (built) plus content |
| 155 | Client Google Sheet workflow | coaching | 14 | 14 | 5 | 11 | 7 | 10 | **61** |  | plan | Coach pack (export shape) |
| 156 | Coach pack (view-only mode, coach export, notes) | docs/packs | 14 | 14 | 9 | 8 | 6 | 10 | **61** |  | plan | pack |
| 157 | Family pack (dependents, credits, 529) | docs/packs | 20 | 13 | 8 | 6 | 8 | 6 | **61** |  | plan | pack |
| 158 | Financial Health Score (0 to 100 from six pillars by age cohort) | v1 inventory | 14 | 16 | 6 | 11 | 6 | 8 | **61** |  | plan | coaching: readiness score (specified, openable) |
| 159 | Mortgage stress (what breaks the deal) | v1 inventory | 14 | 16 | 7 | 11 | 8 | 5 | **61** |  | plan | pack: Home and Level 2 shocks |
| 160 | The Long Way Round: five years down seven paths with shocks | v1 inventory | 14 | 16 | 9 | 9 | 7 | 6 | **61** |  | plan | M5 blocks compared and Level 2 shocks |
| 161 | Variable Income | v1 expansion room | 20 | 11 | 10 | 7 | 7 | 6 | **61** |  | plan | pack: Self-employed |
| 162 | Weather panel (concentration risk and the risks it cannot see) | v1 inventory | 12 | 16 | 8 | 12 | 8 | 5 | **61** |  | plan | M6 Risk screen |
| 163 | Backtests and the optimizer in a Web Worker | docs/performance-budget.md | 16 | 18 | 4 | 9 | 9 | 4 | **60** |  | plan | Upkeep |
| 164 | Coach mode (client picker, read-only share link, monthly check-ins, comments) | coaching | 16 | 12 | 10 | 6 | 6 | 10 | **60** |  | plan | Coach pack and coaching spec 11 |
| 165 | DRAFTT video series as lesson content | v1 learning | 12 | 14 | 8 | 10 | 7 | 9 | **60** |  | plan | coaching: lessons (DRAFTT lens is built) |
| 166 | Level gaps: hand-computed milestone household; hand-checked estate; Hamilton theming | docs/audits/levels-self-audit.md | 12 | 18 | 4 | 11 | 10 | 5 | **60** |  | plan | Levels |
| 167 | Glossary (390 tap-to-define terms) | v1 inventory | 14 | 16 | 5 | 9 | 7 | 8 | **59** |  | plan | coaching: lessons |
| 168 | Six DAITE doors (Debt, Assets, Income, Taxes, Expenses, You) | v1 inventory | 12 | 17 | 5 | 12 | 8 | 5 | **59** |  | plan | entry sections (built as five sections) |
| 169 | Time Buckets | v1 room | 16 | 12 | 11 | 8 | 7 | 5 | **59** |  | plan | M5 dreams (timing curve) |
| 170 | Trust framework (three-question advisor vetting) | v1 inventory | 10 | 14 | 6 | 13 | 8 | 8 | **59** |  | plan | Get Help content |
| 171 | Benchmark source picker (17 voices: Money Guy, ChooseFI, MMM, JL Collins, Big ERN...) | v1 inventory | 12 | 15 | 9 | 9 | 6 | 7 | **58** |  | plan | M4 lenses |
| 172 | Benefits cliff (what a raise takes away: Medicaid, SNAP, ACA) | v1 inventory | 16 | 14 | 10 | 7 | 5 | 6 | **58** |  | plan | pack: Health (ACA cliff built); SNAP and Medicaid need sources |
| 173 | Coach mode (weekly loop with a coach) | coaching spec 11 | 14 | 12 | 10 | 6 | 6 | 10 | **58** |  | plan | coaching spec |
| 174 | Room map and visited bar | v1 inventory | 10 | 18 | 4 | 14 | 8 | 4 | **58** |  | plan | The Sky (built) |
| 175 | Your Credit File (five factors, which the app can see, never a score) | v1 inventory | 12 | 14 | 6 | 12 | 8 | 6 | **58** |  | plan | coaching: lessons |
| 176 | Undo and redo across pages | v1 inventory | 14 | 16 | 5 | 9 | 9 | 4 | **57** |  | plan | entry screen |
| 177 | Benchmarks (wealth multiplier, PAW, five levels of wealth, human capital) | v1 inventory | 12 | 15 | 6 | 11 | 6 | 6 | **56** |  | plan | M4 lenses |
| 178 | FI-losophy | framework | 10 | 12 | 8 | 11 | 7 | 8 | **56** |  | plan | coaching: lessons |
| 179 | PDF spend tracking with auto-categorization | v1 business | 20 | 10 | 9 | 5 | 6 | 6 | **56** |  | plan | Foundations spec: statement upload |
| 180 | Radar (every banded ratio as a spoke) | v1 inventory | 10 | 17 | 5 | 12 | 8 | 4 | **56** |  | plan | M4 Meaning screen (display) |
| 181 | SPARKS tradeoff matrix (13 life metrics, lever cards, constraint mode, Pareto frontier, story mode) | v1 optimization | 16 | 12 | 12 | 4 | 6 | 6 | **56** |  | plan | M2 optimizer (objectives and limits exist) |
| 182 | Share card, QR, and the household in a URL fragment | v1 inventory | 12 | 14 | 8 | 10 | 6 | 6 | **56** |  | plan | icebox |
| 183 | The Mix (target stock, bond, cash and a rebalance band in dollars) | v1 inventory | 12 | 16 | 5 | 11 | 8 | 4 | **56** |  | plan | accounts allocation (built per account); household target is new |
| 184 | Values versus spending audit (top values against where the money goes, no score) | v1 inventory | 12 | 12 | 8 | 10 | 7 | 7 | **56** |  | plan | M4 Meaning (content) |
| 185 | Where You Rank (guess your percentile, then see it) | v1 inventory | 12 | 12 | 10 | 10 | 6 | 6 | **56** |  | plan | M4 lens |
| 186 | Degree as a sum (payback) | v1 inventory | 12 | 14 | 6 | 11 | 7 | 5 | **55** |  | plan | pack: Earn more (skill order) |
| 187 | Expenses from the bank (on-device CSV import) | v1 inventory | 18 | 10 | 8 | 7 | 7 | 5 | **55** |  | plan | Foundations: statement upload spec |
| 188 | Money Calendar and Pay-Later | v1 room | 18 | 8 | 10 | 6 | 8 | 5 | **55** |  | plan | M7 room |
| 189 | Money date night planner (monthly, couples) | v1 inventory | 10 | 12 | 7 | 11 | 7 | 8 | **55** |  | plan | pack: Partner and coaching rings |
| 190 | The Planets (six planets, ten bands, three levels, 180 levels, 184 recipes) | v1 inventory | 14 | 14 | 9 | 5 | 7 | 6 | **55** |  | plan | M3 levels and the Sky (built with five levels) |
| 191 | Room export (any room as CSV, JSON, or print) | v1 inventory | 10 | 16 | 4 | 11 | 8 | 5 | **54** |  | plan | M7 views |
| 192 | Client view (life map, goals, what changed, homework, check-in by 35 and 65 days) | v1 inventory | 10 | 12 | 7 | 8 | 6 | 10 | **53** |  | plan | Coach pack view-only mode |
| 193 | Second Mouse | framework | 10 | 10 | 8 | 12 | 7 | 6 | **53** |  | plan | coaching: lessons |
| 194 | FAT | framework | 10 | 12 | 7 | 11 | 6 | 6 | **52** |  | plan | coaching: lessons |
| 195 | Cash flow Sankey with per-tag budgets | v1 room | 16 | 10 | 7 | 6 | 8 | 4 | **51** |  | plan | M7 room (view) |
| 196 | Coach Home (roster with stage, last session, rough or stale counts, check-in status) | v1 inventory | 10 | 10 | 7 | 8 | 6 | 10 | **51** |  | plan | Coach pack (local list, after the audience decision) |
| 197 | Credit card benefits calculator | v1 tool idea | 12 | 12 | 6 | 11 | 7 | 3 | **51** |  | plan | M3 small wins (rewards.card exists) |
| 198 | Insights from tags | coaching spec 10 | 10 | 12 | 9 | 8 | 6 | 6 | **51** |  | plan | coaching spec |
| 199 | Triple D plan | framework | 10 | 12 | 6 | 11 | 6 | 6 | **51** |  | plan | coaching: programs |
| 200 | Fulfillment curve (joy against spending, four corners) | v1 inventory | 10 | 10 | 8 | 10 | 6 | 6 | **50** |  | plan | coaching: tags |
| 201 | Session console (nine stops, entry forms, done-when tests, detours) | v1 inventory | 10 | 10 | 8 | 6 | 6 | 10 | **50** |  | plan | Coach pack and coaching spec 11 |
| 202 | Aliyah Math (template for any country move) | v1 life | 12 | 10 | 12 | 5 | 5 | 5 | **49** |  | plan | pack: Move (abroad) |
| 203 | Feature switches (18 switches, beginner and FI presets) | v1 inventory | 10 | 14 | 4 | 10 | 7 | 4 | **49** |  | plan | icebox |
| 204 | Prospective and retroactive worth (predicted before, rated after, regrets) | v1 inventory | 10 | 10 | 8 | 9 | 6 | 6 | **49** |  | plan | coaching: tags and insights |
| 205 | Subscription finder (repeating charges) | v1 inventory | 14 | 8 | 7 | 8 | 7 | 5 | **49** |  | plan | M3 small wins (sub.audit) once CSV import exists |
| 206 | Campaign (scenario rounds on a fork of your household, scored against the FOO) | v1 inventory | 10 | 10 | 10 | 5 | 6 | 7 | **48** |  | plan | coaching: lessons (as cases) |
| 207 | House hack calculator | v1 tool | 14 | 9 | 9 | 6 | 6 | 4 | **48** |  | plan | pack: Home (later) |
| 208 | Pilot's Dashboard (seven instruments) | v1 inventory | 10 | 12 | 8 | 8 | 6 | 4 | **48** |  | plan | icebox |
| 209 | Skill Stacker (three skills at a time, did or didn't, what a day was worth) | v1 inventory | 10 | 10 | 6 | 10 | 6 | 6 | **48** |  | plan | coaching: programs |
| 210 | Skill calculator | v1 tool idea | 12 | 10 | 8 | 8 | 6 | 4 | **48** |  | plan | pack: Earn more (later) |
| 211 | The Calendar (31 days plus your own non-money dates) | v1 inventory | 10 | 10 | 5 | 10 | 8 | 5 | **48** |  | plan | coaching: small wins with dates |
| 212 | FI Skill Tree (25 trees, Calculator Lab, 18 dialects, daily layer, skill stacker) | v1 game | 12 | 10 | 10 | 4 | 6 | 5 | **47** |  | plan | M3 levels and tiers (the tier format is kept) |
| 213 | The Deal (rental underwriting: cap rate, cash-on-cash, DSCR) | v1 inventory | 10 | 8 | 8 | 8 | 6 | 4 | **44** |  | plan | pack: Home (later, with the rental stream) |
| 214 | Second Mouse framework (informed-player checklist for bonuses and arbitrage) | v1 inventory | 8 | 8 | 6 | 10 | 6 | 5 | **43** |  | plan | icebox |
| 215 | Arrangements (the rooms shelved 20 ways) | v1 inventory | 8 | 10 | 6 | 9 | 6 | 3 | **42** |  | plan | icebox |
| 216 | Income this month and the log (dated pay entries taxed four ways) | v1 inventory | 12 | 8 | 5 | 6 | 7 | 4 | **42** |  | plan | icebox |
| 217 | The Month: day-by-day account balance and where it flows | v1 inventory | 12 | 6 | 7 | 5 | 7 | 4 | **41** |  | plan | icebox |
| 218 | Every place money went and the slope of the month | v1 inventory | 10 | 6 | 6 | 6 | 7 | 3 | **38** |  | plan | icebox |
| 219 | Variance (estimated versus actual, trend, pattern) | v1 inventory | 10 | 6 | 4 | 7 | 7 | 4 | **38** |  | plan | icebox |
| 220 | The Close (estimate beside actual, month-end close) | v1 inventory | 10 | 5 | 3 | 7 | 7 | 4 | **36** |  | plan | icebox |
| 221 | On the cards (which card, rate, pace to a sign-up bonus) | v1 inventory | 8 | 6 | 5 | 8 | 6 | 2 | **35** |  | plan | icebox |
| 222 | Context packer and per-room Claude commands | v1 inventory | 4 | 8 | 3 | 10 | 6 | 2 | **33** |  | plan | icebox |
| 223 | Client portal (Supabase magic-link logins) | v1 inventory | 6 | 2 | 5 | 3 | 3 | 8 | **27** |  | plan | icebox |
| 224 | Vacation and travel calculator (flights, hotels, points, safety overlay) | v1 inventory | 6 | 6 | 3 | 5 | 5 | 2 | **27** |  | plan | icebox |
| 225 | Government benefits calculator | v1 tool idea | 9 | 5 | 5 | 2 | 2 | 2 | **25** |  | icebox | icebox |
| 226 | Budgeting tool | v1 tool idea | 8 | 3 | 1 | 5 | 5 | 2 | **24** |  | icebox | icebox |
| 227 | Designed Week | v1 room | 6 | 3 | 4 | 5 | 4 | 2 | **24** |  | icebox | icebox |
| 228 | Roots-trunk-branches tree map | v1 game | 5 | 5 | 4 | 5 | 3 | 2 | **24** |  | icebox | icebox |
| 229 | Memory dividends calculator | v1 tool idea | 5 | 3 | 5 | 5 | 2 | 2 | **22** |  | icebox | icebox |
| 230 | Financial personality quiz (five elements, 20 traits) | v1 identity | 5 | 2 | 4 | 4 | 2 | 4 | **21** |  | icebox | icebox |
| 231 | Future-self connector (goals over an aspirational board) | v1 life | 4 | 3 | 3 | 5 | 3 | 3 | **21** |  | icebox | icebox |
| 232 | Marketing scoreboard, content log, people CRM | v1 inventory | 2 | 1 | 3 | 4 | 3 | 8 | **21** |  | icebox | icebox |
| 233 | Dungeons & Dividends (stats, HP, classes, debt as status, monsters, IRS faction, DM mode) | v1 game | 5 | 2 | 7 | 1 | 2 | 3 | **20** |  | icebox | icebox |
| 234 | Ledgerfell (life-sim game) | v1 game | 5 | 3 | 6 | 1 | 2 | 2 | **19** |  | icebox | icebox |
| 235 | The six planets with moons | v1 game | 3 | 4 | 2 | 6 | 3 | 1 | **19** |  | icebox | icebox |
| 236 | Community money date | v1 community | 4 | 2 | 4 | 2 | 2 | 4 | **18** |  | icebox | icebox |
| 237 | Purpose and happiness calculator | v1 tool idea | 4 | 2 | 3 | 5 | 2 | 2 | **18** |  | icebox | icebox |
| 238 | Civ-style tech-tree board with fog and warp shortcuts | v1 game | 4 | 3 | 5 | 2 | 2 | 1 | **17** |  | icebox | icebox |
| 239 | Money Mirror (financial Enneagram) | v1 identity | 4 | 1 | 3 | 4 | 2 | 3 | **17** |  | icebox | icebox |
| 240 | FI Pathway ski mountain (nine lodges, 625 skills) | v1 game | 4 | 2 | 5 | 1 | 2 | 2 | **16** |  | icebox | icebox |
| 241 | SLAM Profit Engine (Hormozi-based pricing and offers) | v1 business | 3 | 1 | 4 | 2 | 2 | 4 | **16** |  | icebox | icebox |
| 242 | Pokémon-style type-chart loop | v1 game | 2 | 1 | 4 | 4 | 2 | 1 | **14** |  | icebox | icebox |
| 243 | The nine Dante spheres | v1 game | 2 | 1 | 4 | 4 | 2 | 1 | **14** |  | icebox | icebox |
| 244 | Travel rewards | v1 learning | 3 | 2 | 1 | 5 | 2 | 1 | **14** |  | icebox | icebox |

## Claims that failed verification

Every financial claim in a ported feature is checked against `data/rules-registry.json` and `data/tax/2026.json` before it moves. Two findings first, then the list.

**The SPARKS luxury strategies catalog and the SPARKS tradeoff matrix are not in the v1 repository.** The word "luxury" appears there only as a travel budget tier. The nearest content is the Tax Strategy, Entrepreneurship, and Card Rewards "moves" in `data/moves.json` (designed, no UI), the Solo 401(k) calculator, and the skill tree's curriculum text. The four corrections the build named are recorded below so they travel with any copy of the catalog that turns up, and the moves and calculators were checked in its place.

### The four named corrections (carry into any port of the catalog)

| Claim | Correction | Registry evidence |
|---|---|---|
| Roth conversions do not count toward MAGI for ACA credits or IRMAA | **They do.** A conversion is ordinary income in AGI; the ACA's MAGI starts from AGI, and IRMAA reads MAGI from two years earlier | `health.acaPtc.2026` (MAGI from AGI plus untaxed Social Security); `health.irmaa.2026` (two-year lookback); the M2 engine sizes conversions inside the MAGI budget for exactly this reason |
| A solo 401(k) can hold up to $300,000 a year | **No.** Employee deferral ($24,500 in 2026, plus catch-up) and the employer share together are capped by the annual additions limit, $72,000 for 2026 (catch-ups sit on top), and by 100% of compensation | `limits.totalAdditions.2026` = 72,000, verified 2026-10-03; `data/tax/2026.json` workplaceElective 24,500 |
| Limits quoted from 2024 | **Use verified 2026 values**: elective 24,500; catch-up 8,000; super catch-up 60 to 63 11,250; IRA 7,500 (catch-up 1,100); HSA 4,400 self-only, 8,750 family, 1,000 catch-up at 55; additions 72,000; Roth IRA phase-out 153,000 to 168,000 single, 242,000 to 252,000 joint, 0 to 10,000 separate | `data/tax/2026.json`; `limits.rothIraIncome.2026`; `limits.457b.2026` |
| Registering an LLC in another state avoids tax where you live and earn | **No.** Residence and where the work is done decide where income is taxed; the entity's state of formation is a record only | Dictionary 9.3 rule; the engine taxes by `self.state` |

### Other claims in v1 that fail verification

| # | Claim (file) | What the registry says | Port? |
|---|---|---|---|
| 1 | Social Security bend points $1,226 and $7,391 and a wage base of $176,100 in `data/ss_bend_points_2026.json` (used by `engines/ss.js`) | Those are 2025 figures; the 2026 wage base in the v2 registry is $184,500 (`ss.wageBase.2026`, itself unverified because ssa.gov blocks the session). The 2026 bend points are in `data/social-security-params` and must be confirmed with the same fact sheet | Not as is; v2 reads its own parameters |
| 2 | Annual additions limit $70,000 in `data/irs_limits_2026.json`; no super catch-up | 2026 is $72,000 (`limits.totalAdditions.2026`); the 60 to 63 catch-up is $11,250 | No; v1's own lane-2 file agrees with v2 |
| 3 | Solo 401(k) employee deferral is the full $24,500 regardless of profit, and only a 20% sole-proprietor employer share (`engines/accounts.js solo401k()`) | The deferral cannot exceed compensation; the employer share is 20% of net earnings after the half-SE-tax deduction for the self-employed and 25% of W-2 wages for an S-corp; all under the additions limit | No; the Self-employed pack specifies the room function |
| 4 | ACA applicable percentages end at 8.66%, with an 8.5% cap when "the cliff is off" (`data/aca_2026.json`) | The 2026 table ends at 9.96% at 300 to 400% of the poverty line (`health.acaPtc.2026`, Rev. Proc. 2025-25, verified 2026-10-03); the 8.5% cap expired after 2025 and the cliff is back | No |
| 5 | COBRA and ACA premiums from KFF 2024 ($8,951 single, $25,572 family, $477 silver) in the sabbatical template | Out of date; v2 carries placeholders marked lookUp until a 2026 source is entered (open item O3) | No; the Health pack sources them |
| 6 | Rule of Five has three definitions in v1 (buy five of it; age divided by 5 months of spending; age divided by 5 in salary multiples) | v2's Level 2 spec defines it once (five months of must-pays) and the engine ties out to the spec's example | Port v2's definition only; the "buy five" line can be a lens with its own name |
| 7 | The FOO ladder in `data/foo_rules.json` does not match the Money Guy's own steps (v1's `docs/SOLAR-SYSTEM.md` D4 has them right) | v2's waterfall is its own order (decisions E10, E11), by strategy, and is not labeled as anyone's | Do not label v2's order as the Money Guy's |
| 8 | DRAFTT defined two ways (…wanTs versus …Taxes, Therapy) | v2's DRAFTT lens uses Debt, Runway, Assets, Flow, Taxes, Therapy (M4 spec); confirm with Eli which is canonical | Confirm before porting any DRAFTT copy |
| 9 | Triple D defined two ways (dream, default, disaster versus drawdown, duration, depth) | v2's bands are best, likely, worst; confirm the name's meaning with Eli | Confirm |
| 10 | The $30k/$90k habit rule: $100 a month divided by 4% equals $30,000 of FI number; about $90,000 invested at 7% over 26 years | The first half is the 25x rule and holds as arithmetic; the second half hard-codes a 7% nominal return where v2 uses the band's real return. Port as a lens line that reads the plan's own band | Port with the plan's numbers |
| 11 | The withdrawal rate disagrees across v1: 4% in defaults, 3.5% in the opening, a hard-coded 25x in the rerank | v2 has no withdrawal rate in the engine: the FI date comes from the year-by-year plan, and 25x is only the 4% lens's comparison | Nothing to port; the lens already states the 4% rule as a comparison |
| 12 | "Check the safe harbor: paying in 100% of last year's tax keeps the penalty away" (`data/moves.json taxes.harvestOnce`) | Incomplete: the safe harbor is 110% when the prior year's AGI was above $150,000 (and 100% otherwise, or 90% of this year's tax). v1's own self-employed engine has it right. The rule is not in the v2 registry yet; add it with its IRS source before any port | Port after the rule is added |
| 13 | "An HSA is the one account that is never taxed" (`data/moves.json health.checkHsaEligible`) | After 65, non-medical withdrawals are taxed as ordinary income (M2 strategy C4, built); the sentence needs "for qualified medical costs" | Port with the qualifier |
| 14 | Rewards "pay about 2%, your card costs about 24%" (card rewards moves) | Rates are placeholders with no source; the v2 small win carries the rule "only if the balance is paid in full" and no rate | Port without the numbers |
| 15 | Student loan IDR as "10% of income over 150% of a $15,000 poverty line" (`engines/studentloans.js`) | The poverty line is a table by household size (`health.fpl.2026`, 48 states), not $15,000, and the IDR plans changed in 2025 and 2026; the registry has no IDR rule | Not until the Debt freedom pack adds a sourced IDR rule |
| 16 | Unemployment "replaces 50% up to the state cap" and benefit weeks by state (`data/ui_benefits.json`) | v2 uses a national placeholder marked unverified because the DOL tables were unreachable; neither is verified | Keep both marked unverified |
| 17 | Life insurance "10x income", disability "60%", emergency fund "3 to 6 months" as fixed rules | v2 computes the term-life range and the disability gap from the plan (Level 2); the fixed multiples are lenses, not rules | Port as lens lines, labeled as rules of thumb |

