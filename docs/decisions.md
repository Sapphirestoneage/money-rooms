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
| P5 | Version 2 is a new repo. Version 1 stays online as a reference. | Locked | One-way | 2026-10-02 | v1's structure (rooms doing their own math) is what's being replaced. |

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
| D15 | Plan-to age defaults to 95. Labeled as a safety choice. | Proposed | Two-way | 2026-10-02 | Running out is worse than leaving some behind. |
| D16 | Retirement spending = baseline + life phases (by age) + healthcare line + goal buckets with priority. | Locked (shape) | One-way | 2026-10-02 | |
| D17 | Phase defaults: go-go to 74 (100%), slow-go 75 to 84 (85%), no-go 85+ (70%) on discretionary categories. | Proposed | Two-way | 2026-10-02 | Placeholder until sourced. |
| D18 | Household of two in the shape from day one; M1 builds self only. | Locked | One-way | 2026-09 | |

## Engine

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| E1 | One year-by-year projection engine. Every room reads from it. | Locked | One-way | 2026-09-30 | |
| E2 | Real dollars inside. Nominal is a display toggle with a plain definition. | Locked | One-way | 2026-10-02 | Prevents counting inflation twice. |
| E3 | Full tax depth is the v1 target. M1 ships the simpler tax set; M2 completes it. | Proposed (split) | Two-way | 2026-10-02 | Keeps the skeleton small without changing the destination. |
| E4 | Annual time step, mid-year timing convention. | Proposed | Two-way | 2026-10-02 | Standard for planning engines; monthly adds cost without much accuracy. |
| E5 | Savings order based on the Money Guy Financial Order of Operations. | Proposed | Two-way | 2026-10-02 | |
| E6 | FI date = earliest fully funded retirement year, per band. Never a fake date. | Proposed | One-way | 2026-10-02 | |
| E7 | Stack: TypeScript, Vite, Vitest; static site on GitHub Pages. No UI framework in M1. | Proposed | One-way | 2026-10-02 | Industry standard; types catch data-model mistakes; stays a simple static site like v1. |

## Meaning and presentation

| # | Decision | Status | Door | Date | Why |
|---|---|---|---|---|---|
| M1 | DRAFTT is an optional branded lens, built after the skeleton. Taxes and therapy are optional letters. | Locked | Two-way | 2026-10-02 | Nothing rests on it. |
| M2 | Payoff methods: avalanche, snowball, and peace-first (minimizes stress-months), shown side by side with the price of peace. | Locked (concept) | Two-way | 2026-10-02 | |
| M3 | Design tokens defined once in `ui/tokens.css`; no screen defines its own colors. | Proposed | One-way | 2026-10-02 | Consistency by construction. |
| M4 | The person's own numbers are never shown in red. | Locked | Two-way | 2026-09 | "What the numbers say," never a verdict. |

## Open

| # | Question | Blocks |
|---|---|---|
| O1 | Phase ages and multipliers: source them (retiree spending research) or keep proposed defaults? | Final retirement spending defaults |
| O2 | High-interest debt threshold for the savings order (proposed 8%). | Savings order |
| O3 | Healthcare cost sources before and after 65. | Healthcare line values |
| O4 | Which Social Security floor to show: retirement fund alone (lower) or combined funds? | Low band value |
