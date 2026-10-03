# Decision log

Every settled decision, with its date and reason, so nothing gets relitigated by accident. This mirrors the cross-section map.

**Statuses**

- **Locked**: decided by Eli. Change only on purpose, with a new entry.
- **Proposed**: a default Claude chose to keep the build moving. Needs Eli's OK. Easy to change.
- **Open**: needs a decision before the work that rests on it.

**Door type**

- **One-way**: expensive to undo, because other things rest on it. Decide carefully.
- **Two-way**: cheap to undo. Decide quickly and move on.

---

## Purpose

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| P1 | Primary audience: people in their 20s pursuing early retirement. The coach-operated version is parked. | Locked | One-way | 2026-10-02 | Every layer above depends on who it serves. |
| P2 | One continuous projection from today through death and estate. Accumulation and decumulation are never split. | Locked | One-way | 2026-10-02 | Splitting them loses money: the target should be shaped by how the money is actually drawn down. |
| P3 | What someone leaves with: a plan with next steps. | Locked | One-way | 2026-09 | |
| P4 | The tool is free; cost sits at the advisor level. Single modules are lead magnets. | Locked | Two-way | 2026-09 | |
| P5 | Version 2 lives in its own repository, money-rooms, deployed to GitHub Pages. Version 1 stays online as a reference. | Locked | One-way | 2026-10-03 | Its own repo, rules, and deploy path. |

## Data model

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| D1 | Inputs split by who owns the answer: facts, assumptions, goals, decisions. | Locked | One-way | 2026-10-02 | |
| D2 | Store parts, compute totals. Nothing derivable is stored. | Locked | One-way | 2026-10-02 | Stored totals go stale silently. |
| D3 | Birth month and year, never age. | Locked | One-way | 2026-10-02 | |
| D4 | Income is a list of streams, each with type, dates, and its own growth. | Locked | One-way | 2026-10-02 | Jobs end, gigs continue (Barista FI), and types are taxed differently. |
| D5 | Income can be entered as gross, take-home, or both. The app solves for the other and reconciles when both are given. | Locked | Two-way | 2026-10-02 | The reconciliation surfaces forgotten pre-tax deductions. |
| D6 | Spending is consumption only. Debt payments and saving live on their own rows. | Locked | One-way | 2026-10-02 | Otherwise the gap and savings rate double count. |
| D7 | Spending is stored smoothed (accrual). Cash timing is a separate view. | Locked | One-way | 2026-10-02 | |
| D8 | Spending tags for why it happened: planned, unavoidable, mistake. Tags cross categories. | Locked (shape) | Two-way | 2026-10-02 | Shows what mistakes cost and whether they repeat. Built Later. |
| D9 | Assets and debts share one accounts list. Presets fill fields; people override. | Locked | One-way | 2026-10-02 | |
| D10 | Stress rating (1 to 5) on accounts and debts. | Locked (shape) | Two-way | 2026-10-02 | Enables peace-first payoff. Built Later. |
| D11 | Every assumption has low, likely, high, and a source. Likely has no hidden padding. | Locked | One-way | 2026-10-02 | Stacked conservatism describes a world that almost never happens. |
| D12 | Assumption sources are FIRE-community voices, loaded as named sets. Default: historical (Trinity Study, Big ERN data). | Locked | Two-way | 2026-10-02 | Trust is part of the product. |
| D13 | Returns are set per asset class, not one rate. | Locked | One-way | 2026-10-02 | |
| D14 | Social Security is a small model: earnings, claiming age, policy. Likely = full scheduled benefit, adjustable to the current-law floor. Zero only by explicit override. | Locked | Two-way (value) | 2026-10-02 | It's policy, not a rule of finance. Dismissing it is hidden padding. |
| D15 | Plan-to age defaults to 95. Labeled as a safety choice. | Locked | Two-way | 2026-10-02 | Running out is worse than leaving some behind. |
| D16 | Retirement spending = baseline + life phases (by age) + healthcare line + goal buckets with priority. | Locked (shape) | One-way | 2026-10-02 | |
| D17 | Phase defaults: go-go to 74 (100%), slow-go 75 to 84 (85%), no-go 85+ (70%) on discretionary categories. | Locked | Two-way | 2026-10-02 | Placeholder until sourced. |
| D18 | Household of two in the shape from day one; M1 builds self only. | Locked | One-way | 2026-09 | |

## Engine

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| E1 | One year-by-year projection engine. Every room reads from it. | Locked | One-way | 2026-09-30 | |
| E2 | Real dollars inside. Nominal is a display toggle with a plain definition. | Locked | One-way | 2026-10-02 | Prevents counting inflation twice. |
| E3 | Full tax depth is the v1 target. M1 ships the simpler tax set; M2 completes it. | Locked (split) | Two-way | 2026-10-02 | Keeps the skeleton small without changing the destination. |
| E4 | Annual time step, mid-year timing convention. | Locked | Two-way | 2026-10-02 | Standard for planning engines; monthly adds cost without much accuracy. |
| E5 | Savings order based on the Money Guy Financial Order of Operations. | Superseded by E10 and E11 | Two-way | 2026-10-02 | Advisor platforms set each contribution by hand. A self-serve tool needs a default. Editable later. |
| E6 | FI date = earliest fully funded retirement year, per band. Never a fake date. | Locked | One-way | 2026-10-02 | |
| E7 | Stack: TypeScript, Vite, Vitest; static site on GitHub Pages. No UI framework in M1. | Locked | One-way | 2026-10-02 | Industry standard; types catch data-model mistakes; stays a simple static site like v1. |
| E8 | Year 0 is a stub period from the plan's as-of month through December. Every flow, tax, limit, and growth rate is prorated by months remaining over 12. Full calendar years follow. | Locked | Two-way | 2026-10-02 | Matches advisor platforms (eMoney, RightCapital, MoneyGuidePro). Balances are dated today, so the projection starts today, not last January. |
| E9 | M1 state tax uses each state's 2026 brackets and standard deduction, not a flat effective rate. Exemptions, credits, local taxes, and special provisions wait for M2. The 48 non-household states come from the Tax Foundation compilation, marked look-it-up until verified officially in M2. | Locked | Two-way | 2026-10-02 | A single rate is wrong at both ends: it overstates tax in low-income retirement years, where the FI date is decided. Same bracket code as federal, so no extra engine work. |
| E10 | Savings waterfall: surplus fills each account up to its legal limit, in the order set by the chosen savings strategy. Tax saved by pretax contributions is looped back in until the surplus settles (it converges because each dollar saves less than a dollar of tax), with one exact final step. | Locked | One-way | 2026-10-02 | Eli: optimize to the legal limits, then waterfall to the next account. |
| E11 | Savings strategy is selectable: Max tax savings now, Max tax-free growth, Entered only. M2 adds "Optimizer decides" (picks whatever produces the best result for the chosen objective). | Locked | Two-way | 2026-10-02 | What you optimize for changes the right waterfall. |
| E12 | M1 is done with Maya hand-checked; Jordan and Dev tie-outs move to before public launch, with unit tests covering their unique pieces now. | Locked | Two-way | 2026-10-02 | Keep momentum; unit tests catch the pieces Maya doesn't exercise. |
| E13 | Cash reserve: 6 months of that year's spending. A shortfall draws cash above the reserve first and the reserve itself last, after Roth. Level 2 will replace the flat 6 months with the Rule of 5 target. | Locked | Two-way | 2026-10-03 | Matches the workpaper; cash is the emergency fund, not the first thing spent. |
| E14 | Mid-year growth: an account's net flow during the year earns half the annual rate (flow x rate / 2), not half-year compounding. Debt payments follow the same rule. | Locked | Two-way | 2026-10-03 | The spec, the engine, and the workpaper now say the same thing. |
| E15 | Workplace contributions are stored as a percent of pay and keep their account type (traditional or Roth) in every strategy. The match top-up applies only below the match cap and goes to the same account type. | Locked | One-way | 2026-10-03 | Payroll elections are percents, so they scale with raises. |
| E16 | Roth 401(k) money sits in its own account at that preset's fee and is drawn before the Roth IRA (higher fee first). M1 treats all Roth withdrawals as tax and penalty free and flags plans that draw Roth money before 59 and a half; M2 applies basis ordering. | Locked | Two-way | 2026-10-03 | Flag the optimism until the real rule exists. |
| E17 | A new debt never defaults silently. Its rate is the preset's typical rate marked roughly, or it must be entered before a plan runs. Its payment is an estimate (each month's interest plus 1% of the balance) marked roughly and flagged until the real one is entered. | Locked | Two-way | 2026-10-03 | A silent $0 payment made a debt look free. |
| E18 | Unemployment benefits are an income type: a benefit amount (usually per week) and the last month it is paid. A stream that ends on a date counts only the months it is paid in its last year. | Locked | Two-way | 2026-10-03 | Eli: include unemployment as a form of income, for how long as well. |
| E19 | Entered numbers are kept from visit to visit: saved on every change, row ids never repeat, and the plan date becomes today on each visit while every value keeps its own as-of date. | Locked | Two-way | 2026-10-03 | Eli: it has to keep its info from round to round. |
| E20 | A promo rate holds through its end month. In the year it ends, the year's rate blends the promo months and the remaining months, compounding. A 0% rate with no end date is allowed but flagged. | Locked | Two-way | 2026-10-03 | Eli's instruction: a 0% card ending May 2027 accrues nothing before June 2027 and the full rate after. |
| E21 | A spending category can hold several rows, each with its own name, start, and end. The engine adds up every row active in a year by the months it covers. In the template, the spending item is a free-text name and the category is a field. | Locked | Two-way | 2026-10-03 | Eli's instruction, found by entering real numbers: a cost like healthcare changes on a date. |
| E22 | Income can be marked expected but not confirmed. It counts in the plan as entered, and the result screen names it in one line. Scenario blocks that include or leave out such income come in Level 3. | Locked | Two-way | 2026-10-03 | Eli's instruction: a date that leans on unconfirmed income should say so. |

## Meaning and presentation

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| M1 | DRAFTT is an optional branded lens, built after the skeleton. Taxes and therapy are optional letters. | Locked | Two-way | 2026-10-02 | Nothing rests on it. |
| M2 | Payoff methods: avalanche, snowball, and peace-first (minimizes stress-months), shown side by side with the price of peace. | Locked (concept) | Two-way | 2026-10-02 | |
| M3 | Design tokens defined once in `ui/tokens.css`; no screen defines its own colors. | Locked | One-way | 2026-10-02 | Consistency by construction. |
| M4 | The person's own numbers are never shown in red. | Locked | Two-way | 2026-09 | "What the numbers say," never a verdict. |

## Open

| # | Question | Blocks |
|---|---|---|
| O1 | Phase ages and multipliers: source them (retiree spending research) or keep proposed defaults? | Final retirement spending defaults |
| O2 | High-interest debt threshold for the savings order (proposed 8%). | Savings order |
| O3 | Healthcare cost sources before and after 65. | Healthcare line values |
| O4 | Which Social Security floor to show: retirement fund alone (lower) or combined funds? | Low band value |

## M2 decisions (added 2026-10-02)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| N1 | Every early-access and tax strategy is in scope, each as a toggle that shows its effect in years and dollars. | Locked | One-way | 2026-10-02 | No consumer calculator models these together. That is the product. |
| N2 | Show Gross FI (4% rule) and Net FI (optimized lifetime projection) side by side, with the difference in dollars and years. | Locked | One-way | 2026-10-02 | People optimize for a number; Money Rooms finds what the number actually is. |
| N3 | Optimizer objective is selectable: earliest FI, most spending, least lifetime tax, biggest estate. The others become limits. | Locked | One-way | 2026-10-02 | |
| N4 | Any year's choice can be locked by hand; the optimizer plans around locks. | Locked | One-way | 2026-10-02 | Flexible scenarios, like taking the ACA credit one year and converting the next. |
| N5 | Every rule lives in data/rules-registry.json with source, link, sunset, watch status, and last-verified date. Plans flag rules that are sunsetting or under watch. | Locked | One-way | 2026-10-02 | Tripwires: the rules change, and the app has to say when a plan depends on one that might. |
| N6 | The optimizer searches over a small set of policy knobs, running the full projection for each. | Proposed | Two-way | 2026-10-02 | How professional planning tools do it; a true solver over 60 years is slow and fragile. |
| N8 | The True FI number is an unlockable reveal after the drawdown inputs are complete (answered, roughly, or not for me). It animates from the FI number, lands on the difference in years and dollars, and its share card never shows balances by default. | Locked | Two-way | 2026-10-02 | Drama earns attention, and the gate keeps a guess from looking like an answer. |
| N9 | "Roughly" answers count toward the unlock. | Proposed | Two-way | 2026-10-02 | Keeps the bar low; the result shows its confidence. |

## M3 decisions (added 2026-10-02)

Rows L1 to L7 were not received by Claude Code when this table was created (the request referred to changing L6 from Proposed to Locked). Eli: paste them in above L8.

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| L8 | Aged numbers get a Refresh card: each shows its value, age, and next check date; confirming restarts its clock. The next card still pulls aged numbers only when material. | Locked | Two-way | 2026-10-02 | See what's aged, clear it, and the ticker restarts. |
| L9 | Rough numbers get the same card pattern, sorted by materiality with a running bar of uncertainty cleared. | Locked | Two-way | 2026-10-02 | Most people can clear the majority with the first few. |
| L10 | The Sky zooms like a globe: everything, then an area, then a row, with an outline view as the accessible alternative. | Locked | One-way | 2026-10-02 | See the whole picture and zoom in where you want, when you want. |
| L11 | Every preference, including entry mode, can be changed at any time without losing anything. Accessibility is a default, not a feature. | Locked | One-way | 2026-10-02 | |

## Level 2 decisions (added 2026-10-02)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| R1 | Emergency target uses the Rule of 5: age / 5 months of full spending, adjusted by an income stability multiplier, with an exact monthly savings number. | Locked | Two-way | 2026-10-02 | "Three to six months" is tired; this grows with you and tells you what to save. |
| R2 | Graceful degradation staircase: full, DRAFTT, FAT, food and housing, couch mode, with must-pays shown on every step. | Locked | One-way | 2026-10-02 | Shows how much longer you last at each step down. |
| R3 | Runway stack: cash, ability to cut, unemployment, severance, reachable investments. Retirement accounts only as an opt-in break-glass line. | Locked | One-way | 2026-10-02 | Backups of the backups. |
| R4 | Disability insurance in the core level; term life only with dependents; other insurance as a side quest. | Locked | Two-way | 2026-10-02 | Most insurance isn't material for most people in their 20s. |
| R5 | Zombie readiness theme with original humor; peer comparisons only from a sourced dataset. | Locked | Two-way | 2026-10-02 | You don't have to outrun the zombies, just your friends. |
| R6 | Stability multipliers 0.8 / 1.0 / 1.5; graceful path steps down every 2 months. | Proposed | Two-way | 2026-10-02 | Placeholder defaults. |

## Level 3 decisions (added 2026-10-02)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| G1 | Every dream shows its price in order: cost in time, true amount (invested at the likely return, today's dollars), the other side of the trade, best timing. | Locked | Two-way | 2026-10-02 | A real choice, not a guilt trip. |
| G2 | Best timing slides the dream across its window and marks where the cost drops (debt payoff, Coast FI, other events). Suggestions only. | Locked | Two-way | 2026-10-02 | Push it off a little, shown rather than preached. |
| G3 | Milestones beyond FI: walk-away money, start a business, sabbatical, plus the FIRE spectrum (Coast, Barista, Lean, Flex, Slow, FI, Fat), each with a date. | Locked | One-way | 2026-10-02 | Next-stage paths matter more than one finish line. |
| G4 | Lean FI uses the FAT step of the Level 2 staircase. Slow FI means enjoying the journey: the most extra spending or least work that still hits FI by a chosen age. Flex FI arrives with M6. | Locked | Two-way | 2026-10-02 | |
| G5 | Defaults: coast age 65, part-time income $20,000, Fat FI 1.5x spending, Flex trim 10%, Slow FI target = FI date + 5 years, walk-away 12 months. | Proposed | Two-way | 2026-10-02 | Placeholders, all editable. |

## Level 5 decisions (added 2026-10-02)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| Y1 | Legacy has two editions: money (estate after heirs' taxes, basics checklist, giving) and Hamiltonian (legacy projects with money and time). The bucket list is the bridge: any dream can be tagged legacy. | Locked | One-way | 2026-10-02 | Once you can do anything, legacy is the next big thing. |
| Y2 | Legacy FI: a milestone where the plan stays funded and pays for every legacy project. A breathing-room slider sets the margin. | Locked | Two-way | 2026-10-02 | You want freedom to build a legacy, and that freedom has a price. |
| Y3 | A freedom budget shows hours freed after FI, with legacy projects placed in it. | Locked | Two-way | 2026-10-02 | Legacy costs time as well as money. |
| Y4 | Hamilton references use only Hamilton's public-domain writings, never the musical's lyrics; theming is optional and off by default. | Locked | Two-way | 2026-10-02 | Keeps the brand clean. |
| Y5 | Defaults: breathing room 10% of the FI number, heir tax rate 22%. | Proposed | Two-way | 2026-10-02 | Placeholders, editable. |

## Entity map decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| X1 | A workplace contribution names its plan and destination account instead of being matched by preset. | Proposed | Two-way | 2026-10-04 | Two 401(k)s, or a 403(b) beside a 457(b), cannot be told apart by preset. |
| X2 | Workplace plan is its own entity: type, match, rule of 55, governmental 457(b), mega backdoor, separation age. Accounts hold money; plans hold rules. | Proposed | One-way | 2026-10-04 | The M2 strategies A4, A7, E3, and F1 need plan rules that no account field can carry. |
| X3 | Business is its own entity grouping self-employed income, expenses, and business debts; state of formation is a record, never a tax effect. | Proposed | One-way | 2026-10-04 | Net profit, self-employment tax, QBI, and solo 401(k) room all read from one place. |
| X4 | Every account and plan has an owner: self, partner, or joint. Retirement accounts and plans are never joint. | Proposed | One-way | 2026-10-04 | Households of two need to know whose age and whose record apply. |
| X5 | Scenario blocks are layered proposed changes applied in memory. Real rows are never edited by a block. | Proposed | One-way | 2026-10-04 | A what-if that edits real numbers is a lost number. |
| X6 | Roth conversions are records with amount, month, and a computed five-year clock. Future conversions live as year locks until they happen. | Proposed | Two-way | 2026-10-04 | The ordering rules (A1, A2) and MAGI effects (C1, C3) need each conversion's date. |

## M2 engine decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| N10 | The engine has two conventions, m1 and m2, chosen per run. m1 is the tied-out skeleton and never changes; the app runs m2. | Proposed | Two-way | 2026-10-04 | The tripwire: Maya must tie out under m1 after every engine change, and nothing in m2 can touch that path. |
| N11 | Level-two defaults: taxable basis 70% of balance, Roth contribution basis 50%, first Roth year five years before the plan date, ACA household size 1, Medicaid expansion unknown. All roughly. | Proposed | Two-way | 2026-10-04 | M2 spec section 7 sets the first two; the rest keep the engine running until asked. |
| N12 | Before 65 the engine never draws from an HSA beyond saved receipts, so the 20% additional tax is never modeled as a choice. From 65, HSA draws are ordinary income. | Proposed | Two-way | 2026-10-04 | Nobody should be shown a plan that pays 20% on purpose. |
| N13 | The 72(t) annuitization method is approximated with the Single Life table until the IRS mortality table is loaded. The federal mid-term rate is a policy input with the 5% floor applied. | Proposed | Two-way | 2026-10-04 | The notice's mortality table is not in data/ yet; the result is within a few percent of amortization and flagged. |
| N14 | Conversions and harvests are sized inside the shortfall loop after the year's sales, so bracket targets and the ACA budget see the whole year. | Proposed | Two-way | 2026-10-04 | Sizing them first double-filled the 0% bracket and blew through the ACA target. |
| N15 | Health care before 65 uses one benchmark premium at every age and one Medicaid expansion answer (unknown by default). From 65, IRMAA uses the plan date's MAGI for lookback years before the plan. | Proposed | Two-way | 2026-10-04 | Placeholders until O3 is sourced; the mechanics are in and tested. |
| N16 | Under m2, income streams with an age or date end keep paying after retirement (Barista FI). Only streams ending at retirement stop. | Proposed | Two-way | 2026-10-04 | Replaces M1 convention C27, which the M2 spec (E6) planned to replace. |
| N17 | Required distributions not needed for spending go to the taxable account the same year. | Proposed | Two-way | 2026-10-04 | The money has to land somewhere; taxable is where a surplus already goes. |

## M2 optimizer decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| N18 | The search is coordinate descent over the knobs from the default policy, two passes, then a sweep of two knob pairs (conversion target with ACA target, conversion target with harvesting). Likely band only. | Proposed | Two-way | 2026-10-04 | About a hundred projections for Maya, under a second. An exhaustive search is thousands. |
| N19 | Objectives other than earliest FI hold the retirement year fixed at the FI year under the default policy unless the person picks one. Most spending bisects a spending scale between 0.5 and 3 times entered spending. | Proposed | Two-way | 2026-10-04 | The spec says the others become limits; the FI date is the natural one to fix. |
| N20 | Toggle and stress effects report years from a fresh FI search and dollars from a rerun at the same retirement year, never both from one run. | Proposed | Two-way | 2026-10-04 | Mixing them made "turn off conversions" look like it saved tax because it retired later. |
| N21 | The 72(t) knob is on or off: on means amortization at the 5% floor from the first retired year. Rule of 55 is offered only when a plan says it allows it. The contribution-type knob is offered only when a workplace contribution exists. | Proposed | Two-way | 2026-10-04 | Keeps the search small and every candidate meaningful. |
| N22 | The result screen's default section order: FI date, True FI, net worth chart, the plan, strategies, key figures, tripwires and stress test, rules behind the plan, flags. Rearrangeable, stored with display preferences, never with the household. | Proposed | Two-way | 2026-10-04 | Spec section 9 asks for a default order and a customizable one. |
| N23 | The True FI number is the optimizer's earliest-FI result (assets at that date); the FI number is 25 times current spending. The reveal animates only when motion is allowed. | Proposed | Two-way | 2026-10-04 | Spec section 2 and 9. |

## M3 flow decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| L12 | The FI number the materiality engine measures is assets at the FI date (likely band). An input's sensitivity is the change in the ending balance when the input is nudged to each end of its plausible range with the retirement year held, discounted back to the FI date at the likely blended return. Months at stake use the last working year's asset growth. | Proposed | Two-way | 2026-10-04 | The spec wants a smooth dollar measure where the date moves in whole years. Two projections per input keeps it fast. |
| L13 | Coverage ("92% of what matters") is the impact-weighted share held by known values, not a count of fields. Level 1 passes when the required answers are in and nothing material is left to sharpen; Level 4 passes when the drawdown inputs are in. Levels 2, 3, and 5 pass when their content is built. | Proposed | Two-way | 2026-10-04 | Spec section 7. |
| L14 | A required level-one answer is valued at the whole FI number (or $1,000,000 before there is one); a later-level item without a measured value is valued at 2% of the FI number, so it waits its turn but can be reached. | Proposed | Two-way | 2026-10-04 | Nothing shows without the required answers; later items need a placeholder to rank at all. |
| L15 | Small wins answers (done, not for me, later) are stored on the household by win id (dictionary 9.7). A dollar a year of spending cut counts as 25 dollars of FI number when testing promotion, the same scale as the material line. | Proposed | Two-way | 2026-10-04 | What a person did is a fact about them, not a display choice. |
| L16 | Entry mode, the materiality share, and the FI year at the last refresh are display preferences. The guided mode walks the five sections one per step; dump mode moves the paste box to the top. | Proposed | Two-way | 2026-10-04 | Spec sections 8 and 12; none of these are plan data. |
| L17 | The Sky draws one orbit of circles per zoom level, sized by the square root of materiality so small items stay visible, with the outline as the equal alternative. | Proposed | Two-way | 2026-10-04 | Spec section 13 and decision L10. |

## Level content decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| R7 | The staircase keeps categories by step from `data/resilience.json`: DRAFTT keeps housing, utilities, food, transportation, and therapy; FAT drops therapy; food and housing drops transportation; couch mode keeps food. Must-pays are the insurance, healthcare, and phone rows plus debt minimums plus anything entered. | Proposed | Two-way | 2026-10-04 | Level 2 spec section 3 names the letters; the category mapping is the engine's reading of them. |
| R8 | Unemployment uses a national placeholder (50% of the weekly wage up to $600, 26 weeks) marked unverified until the state table is sourced. The Department of Labor pages could not be reached from the build session. | Proposed | Two-way | 2026-10-04 | Rule 9 of the build: keep a value, mark it, give the URL. |
| R9 | Health insurance after a job loss is the marketplace benchmark less the credit at unemployment-only income (Medicaid at zero in an expansion state). COBRA is not entered yet. | Proposed | Two-way | 2026-10-04 | Reuses the M2 ACA mechanics. |
| R10 | Shock tests change the inputs and rerun the FI search: a job loss or disability ends every stream now and restarts it after the months, with the benefit as a dated stream; a market drop cuts today's balances by the stock share times the drop; a bill is a one-month spending row. Runway after the shock is measured from cash. | Proposed | Two-way | 2026-10-04 | "The year it would hurt most" needs M6's sequence machinery; today's drop is the honest proxy. |
| G6 | Coast FI uses today's assets grown at the likely blended return to the coast age against the FI number. Barista FI locks part-time income every year to 65. Lean and Fat FI scale spending (the FAT step share, and the multiplier). Slow FI bisects the spending scale at the target year. Walk-away and business milestones read the Level 2 runway. | Proposed | Two-way | 2026-10-04 | Each condition rendered with the engine hooks that exist; Flex FI waits for M6. |
| Y6 | Giving forever uses the plan's own sustainable withdrawal rate (first retired year's spending over assets at retirement), not a fixed 4%. Legacy FI adds each project's money as dated giving rows and reruns the FI search. The breathing room is a margin on the FI number, reported as the year the working plan reaches it. | Proposed | Two-way | 2026-10-04 | Spec section 3 says "the plan's sustainable withdrawal rate". |

## M5 what-if decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| W1 | A block's changes are applied to a copy of the household: added rows carry the block's id; a scale change ends the original row the month before and adds a scaled copy (and a resumed copy after any end); a pause does the same with nothing in between. The real rows are never touched. | Proposed | Two-way | 2026-10-04 | Decision X5 made concrete. |
| W2 | The questionnaire's national defaults live in `data/scenario-blocks.json`, all marked roughly and unsourced until checked. A home block adds a 30-year mortgage at the stated rate, upkeep at 1.5% of price, and removes the rent; a car block adds a loan and running costs; a kid adds an annual cost for the years plus five years of childcare. | Proposed | Two-way | 2026-10-04 | Starting points the person edits; state defaults and quotes replace them. |
| W3 | A block's headline measures cash flow in the first full year after its start (the gap with the block minus without) and the FI date from a fresh search, with every other enabled block already applied. | Proposed | Two-way | 2026-10-04 | Spec section 2. |
| W4 | Goals are laid into spending as dated rows. "Short" means not funded at the baseline FI year; dreams are trimmed first (largest first), then wants; musts are never trimmed. A trimmed goal's "fits from" is the earliest start age at which it keeps the plan funded. | Proposed | Two-way | 2026-10-04 | Data dictionary 5.1 layer 3. |
| W5 | The true amount grows the cost at the likely blended real return to age 65 (the spec's example). The timing curve covers ten years from the chosen age (eight on screen); markers are debt payoffs, Coast, Lean, and FI dates, income starts and ends, and other dreams ending. | Proposed | Two-way | 2026-10-04 | Spec sections 3 and 4. |
| W6 | Payoff methods run a monthly simulation of the debts alone at a fixed budget (the minimums plus any extra): minimums first, the rest to the method's first open debt. Peace-first tries every order when there are six or fewer debts and minimizes stress times months owed; stress defaults to 3. The price of peace is its extra interest over the avalanche. | Proposed | Two-way | 2026-10-04 | Decision M2 made concrete. |

## M4 meaning decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| K1 | Every ratio lives in `data/ratios.json` with formula, inputs, unit, unlock level, sentence template, optional plain-word bands, and the lenses it belongs to. Values are computed each time. | Proposed | Two-way | 2026-10-04 | M4 spec 2.1; a reader can repeat the arithmetic. |
| K2 | A ratio is locked until its level is passed, unless the person asks for it. Level 1 ratios are never locked. | Proposed | Two-way | 2026-10-04 | M4 spec 2.2. |
| K3 | The Shockingly simple math table is recomputed from its stated 5% real return and 4% withdrawal rate, and compared with the plan's own years to FI. | Proposed | Two-way | 2026-10-04 | A lens shows the idea, the plan shows the answer. |
| K4 | The DRAFTT scorecard measures five letters against take-home pay and taxes against gross pay; therapy and taxes are optional letters off and on by toggle. The ranges are common guidance written as plain words, never verdicts. | Proposed | Two-way | 2026-10-04 | Decision M1 says the letters are optional. |
| K5 | The Advice Translator's ten lines and their rules live in `data/advice.json`; each verdict (applies, partly, unlearn) is one sentence from the person's numbers. New lines are added to the data file, never to code. | Proposed | Two-way | 2026-10-04 | M4 spec 2.4. |
| K6 | M4 stores nothing; which lens is open and the DRAFTT letters are display state. A test scans every M4 sentence for instructing phrases. | Proposed | Two-way | 2026-10-04 | Style guide: never a verdict. |

## M6 risk decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| Q1 | The return series is `data/returns-history.json`: annual real returns on US stocks, 10-year Treasuries, and bills from 1928, made real with CPI. It was typed from memory of the Damodaran series because the sources were unreachable from the build session, and is marked unverified; every M6 result carries a flag until it is checked. | Proposed | Two-way | 2026-10-04 | Rule 9 of the build: keep a value, mark it, give the URL. The mechanics are built and tested; the numbers are not trusted. |
| Q2 | A backtest replays the whole plan (working years too) from each start year with that year's returns; starts need at least 30 years of history, and missing tail years use the likely band's return and are counted. | Proposed | Two-way | 2026-10-04 | More starts, honestly labeled, beat a handful of full-length ones. |
| Q3 | The sturdy FI date is the earliest retirement year whose success rate reaches the threshold (default 90%), searching up from the deterministic date. | Proposed | Two-way | 2026-10-04 | M6 spec 2.2. |
| Q4 | Guardrails: cut 10% above 1.2 times the initial withdrawal rate, raise 10% under 0.8 times, never below 60% of plan. The initial rate is measured in the first retired year. | Proposed | Two-way | 2026-10-04 | Guyton-Klinger simplified to its two guardrails. |
| Q5 | Flex FI trims spending by the Level 3 trim (10%) in every retired year whose stock return was negative, and its date is the sturdy FI date with the trim. It replaces "coming soon" on the spectrum; callers that need speed can skip it. | Proposed | Two-way | 2026-10-04 | M6 spec 2.4 and Level 3 decision G4. |
| Q6 | The engine gained two hooks: real returns by calendar year, and a spending adjuster for retired years. Under the tie-out neither is set, so m1 is unchanged. | Proposed | Two-way | 2026-10-04 | The tripwire held: Maya ties out after the change. |

## Households of two decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| H1 | One retirement date for the household. Both people's streams stop at it unless a stream carries its own end. Different dates per person wait. | Proposed | Two-way | 2026-10-04 | The FI search is one dimension; a second date is a later version. |
| H2 | Married filing separately is two returns: the partner's on their own earned income and benefit, the self's on everything else (withdrawals, gains, conversions). State tax follows the same split. | Proposed | Two-way | 2026-10-04 | The simplest honest reading until account ownership drives the split. |
| H3 | Spousal and survivor Social Security read `ss.spousalAndSurvivor` through a new ledger door for unverified rules; every plan the rule changes carries a flag until the rule is checked against ssa.gov. The survivor rule starts the year after the first plan-to age. | Proposed | Two-way | 2026-10-04 | Build rule 9: keep the value, mark it, give the URL. |
| H4 | The optimizer's claiming-age knob moves the self only. The partner claims at their entered age or their full retirement age. | Proposed | Two-way | 2026-10-04 | One knob per search dimension for now. |
| H5 | The waterfall fills the self's accounts first and then the partner's workplace plan (match top-up, then the plan to its limit) in the same strategy order. The partner's HSA and IRA get only what is entered. | Proposed | Two-way | 2026-10-04 | Spec 2.3 allows self first then partner; the other steps are a later version. |
| H6 | Removing a partner asks first, then removes their income rows and marks their accounts as the self's. Rows are not kept in the export after removal. | Proposed | Two-way | 2026-10-04 | A removed partner's rows with no owner would be a dangling fact; the confirm panel says what goes. |
| H7 | A joint account reads the older owner's age for penalties and the younger's for required distributions. Debts can be joint. | Proposed | Two-way | 2026-10-04 | The conservative reading of each rule. |
| H8 | Health care in retirement is priced per adult: one marketplace line for the adults under 65 (benchmark per adult), one Medicare line per adult 65 and over, on the household's MAGI. | Proposed | Two-way | 2026-10-04 | A couple pays two premiums; IRMAA is per person. |

## Expansion pack decisions (added 2026-10-04, overnight build, specs only)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| P1 | A pack unlocks on a condition the engine reads from the household (a stream type, a debt, a partner, a level), never on a purchase or a flag the person cannot see. | Proposed | Two-way | 2026-10-04 | Packs add breadth for some; the condition is the honest gate. |
| P2 | Every pack field goes in the data dictionary before code, every pack rule in the registry with a source, and a pack's result is a view on the one engine. | Proposed | One-way | 2026-10-04 | The architecture rules do not bend for packs. |
| P3 | Six packs need new engine capability (Self-employed, Home, Family, Coach, and partly Partner, Move, Health, Taxes); two need none (Earn more, Debt freedom). The index table in `docs/packs/README.md` says which. | Proposed | Two-way | 2026-10-04 | So the order of building can follow value against engine cost. |

## Foundations decisions (added 2026-10-04, overnight build)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| F1 | The Pages deploy is three jobs, test then build then deploy, and a second workflow runs the same checks on every other branch and pull request. The checks are types, every test, the Maya tie-out, and (on branches) the build. | Proposed | Two-way | 2026-10-04 | A red test or a moved tie-out must stop a deploy before anything is built. Left on `foundations` for review; main is untouched. |
| F2 | The backup nudge reads display preferences only (last export date, snooze date), never the household, and shows after 30 days without an export or when none was ever made. | Proposed | Two-way | 2026-10-04 | Nothing about the plan changes; the nudge is a display concern. |
| F3 | Progress snapshots are the one stored derived value: a past date's results cannot be recomputed once inputs change. One per date, taken by the result screen, capped at 400 with the first kept, stored with the household so they travel in the export. | Proposed | One-way | 2026-10-04 | `docs/history-spec.md` section 2. |
| F4 | The trend sentence compares the latest snapshot with the earliest at least 28 days older, or the earliest of all, and describes the likely FI date, net worth, and the savings rate in that order. | Proposed | Two-way | 2026-10-04 | Day-to-day noise would otherwise dominate the sentence. |
| F5 | Two trust pages, About and Privacy, reachable from a footer on every screen; the only destructive action in the app (delete everything in this browser) lives on Privacy behind the confirm panel. | Proposed | Two-way | 2026-10-04 | The build's trust requirement. |
| F6 | Three specs written without code: statement upload (browser-only parsing by pattern table, no AI call), the rules update routine (the November and January calendar), and the performance budget (150 KB gzipped target, 200 KB hard limit, long work in a worker). | Proposed | Two-way | 2026-10-04 | Each needs Eli's decision before it costs engineering. |

## Coaching decisions (added 2026-10-04, overnight build, spec only)

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| C1 to C12 | The weekly loop as specified in `docs/coaching-spec.md` section 16: weekly not daily, three rings, an openable readiness score with fixed weights, programs as content with progress as records, re-planning at the material line, records as dated bests, four engine-read phases, a four-line recap, rest-day headroom from the FI search, insights only from eight tagged weeks, coach mode through exports only, streaks with automatic freezes. | Proposed | Two-way | 2026-10-04 | Each is listed in the spec with its reason; none is built. |
