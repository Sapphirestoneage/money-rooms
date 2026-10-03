# Data dictionary: Level one

The data dictionary is the chart of accounts for Money Rooms. It defines every piece of information the app stores, how it's stored, and what depends on it.

**If a field isn't here, it doesn't exist.** New fields get added to this document first, then built.

This version covers **level one**: everything the walking skeleton (milestone M1) needs to produce an FI date with a best, likely, and worst range. Fields marked *Later* are defined now so their shape is settled, but they aren't built in M1.

---

## 1. How every field is described

| Column | Meaning |
|---|---|
| **Kind** | Who owns the answer. **Fact**: reality (checkable against a statement). **Assumption**: the world (nobody can know it, so it gets a range). **Goal**: the person (what they want). **Decision**: the person (a choice the engine can test, like claiming age). |
| **Unit** | The specific measure: dollars, percent per year, month and year, a pick list. |
| **Entered as** | The formats a person can type it in. Can differ from how it's stored. |
| **Stored as** | The single normalized form the engine reads. |
| **Cadence** | How it behaves over time: one-off, or a value with start and end dates. |
| **Default** | What the engine uses if the field is blank. "Required" means it must be *answered*, which can include "I don't have this." |
| **Source** | Where the value comes from: user, statement, preset, assumption set, or computed. |
| **Confidence** | How sure the value is (see section 2). |
| **Validation** | Controls on the entry: what's impossible or suspicious. |
| **Relevance** | When the field exists for this person. |
| **Feeds** | What the engine uses it for. This is the start of the dependency graph. |

---

## 2. Rules that apply to every field

**2.1 Every value carries metadata.**

| Metadata | Values |
|---|---|
| `asOf` | The date the value was true |
| `source` | `user`, `statement`, `preset`, `assumptionSet`, `computed` |
| `confidence` | `known`, `lookUp`, `roughly`, `computed`, `notForMe` |

`known`: the person is sure. `lookUp`: they can find it, and the app says where. `roughly`: a placeholder estimate. `computed`: the engine derived it, with inputs linked. `notForMe`: doesn't apply, and counts as complete.

**2.2 Store parts, compute totals.** No total, net, ratio, or age is ever stored. Total income, net worth, the gap, age, and tax rates are always computed.

**2.3 Real dollars.** All money is stored in today's dollars. Assumptions are real rates. Nominal values are produced only at display time, using the inflation assumption.

**2.4 Annual normalization.** Recurring money is stored as an annual amount. Entry and display formats are free (per hour, per paycheck, per month, per year).

**2.5 Lists, not single fields.** Income, spending, accounts, and goals are lists of rows. Each row has a stable `id`.

**2.6 Dates for anything that changes.** Rows that can start, stop, or change rate carry `start` and `end`. `end` can be a date, an age, or the event `retirement`.

**2.7 Household of two.** Every person-level field exists for `self` and optionally `partner`. M1 builds `self` only, but the shape supports two from day one.

**2.8 Every question has an "I don't" answer.** No question forces a number on someone it doesn't apply to.

**2.9 Presets fill fields, people override.** Choosing a type (like "Roth IRA") fills its fields from `data/`. Any filled value can be changed, and the change is recorded with `source: user`.

---

## 3. Facts

### 3.1 Birth date

| Column | Value |
|---|---|
| Kind | Fact |
| Unit | Month and year |
| Stored as | `YYYY-MM` |
| Cadence | One-off |
| Default | None. Required |
| Source | User |
| Confidence | Always `known` |
| Validation | Not in the future. Implied age 16 to 100 |
| Relevance | Always |
| Feeds | Every age in the timeline; plan-to age horizon; age 50 catch-up contributions; 59½ penalty-free access; 65 Medicare; Social Security claiming; required distributions; life phases |

Age is never stored. It's computed from birth date and the projection year.

### 3.2 Filing status

| Column | Value |
|---|---|
| Kind | Fact |
| Unit | Pick list: `single`, `marriedJoint`, `marriedSeparate`, `headOfHousehold` |
| Cadence | Value with dated changes |
| Default | `single`, confidence `roughly` |
| Source | User |
| Validation | Married statuses require a partner record (Later) |
| Relevance | Always |
| Feeds | Federal brackets and standard deduction; contribution limits; Roth IRA eligibility; ACA subsidy (Later) |

### 3.3 State of residence

| Column | Value |
|---|---|
| Kind | Fact |
| Unit | Pick list of US states and DC |
| Cadence | Value with dated changes |
| Default | None. Required |
| Source | User |
| Relevance | Always |
| Feeds | State income tax; cost-of-living defaults (Later) |

### 3.4 Income streams (list)

One row per source of income. Total income is computed.

| Column | Value |
|---|---|
| Kind | Fact |
| Row type | Pick list: `salary`, `hourly`, `selfEmployed`, `sideGig`, `unemployment`, `allowance`, `rental` (Later), `other` |
| Unit | Dollars. `hourly` also stores hours per week |
| Entered as | Gross, take-home, or both; per hour, per paycheck, per month, or per year |
| Stored as | Annual gross dollars, plus `enteredTakeHome` if given |
| Cadence | `start`, and `end` as a date, an age, or `retirement` |
| Default | None. Required to answer: at least one stream, or "I don't have income right now" |
| Source | User |
| Confidence | `known` for salary by default; `roughly` for hourly, self-employed, and gigs unless marked otherwise |
| Validation | Not negative. Hours per week 1 to 80. Take-home below gross. Gentle flag if spending far exceeds income |
| Relevance | Always asked. Follow-up fields depend on type (below) |
| Growth | Each row has its own real growth assumption, defaulted by type from the active assumption set |
| Feeds | The gap; savings rate; federal and state tax; FICA or self-employment tax; Social Security earnings record; employer match; contribution limits; Roth IRA eligibility; ACA subsidy (Later); debt-to-income |

**Gross, take-home, or both:**

| Entered | Engine does | Confidence |
|---|---|---|
| Gross only | Computes taxes and deductions to get take-home | As entered |
| Take-home only | Back-solves gross | `roughly` |
| Both | Reconciles: gross minus computed taxes should equal take-home. The unexplained remainder is surfaced as likely pre-tax deductions ("About $340 a month leaves before your paycheck. Is that a 401(k)?") | Highest |

**Follow-up fields by type:**

| Type | Asks |
|---|---|
| `salary` | Pay frequency; employer match; pre-tax deductions |
| `hourly` | Hours per week; pay frequency; employer match if any |
| `selfEmployed` | Business expenses (annual); entity type (Later) |
| `sideGig` | Business expenses (annual) |
| `unemployment` | Benefit amount (usually per week); the last month it is paid |
| `allowance` | End date |

**Unemployment benefits.** Entered as the benefit amount (per week, month, or year) and the last month it will be paid. Stored like every stream: an annual amount and an `end` date. Most states pay up to 26 weeks, so a new row starts with an end six months out, and the person sets the real month. The benefit is taxed as ordinary income by the federal government and by the state's brackets, with no Social Security or Medicare tax, and it does not count toward the Social Security earnings record. Confidence defaults to `known`: the amount is on the determination letter.

**Entry screen summaries.** The count, total, rough and missing counts, and the complete mark shown on each entry screen section are computed from the stored rows each time (`entrySummary`), never stored. Income and spending totals are per year and count only rows being paid in the plan month. Account and debt groups (`data/entry-groups.json`) and their subtotals are computed the same way.

**Expected but not confirmed.** A stream can be marked not confirmed (`notConfirmed`): income the person expects but that is not yet certain, like a contract still being signed. It counts in the plan like any other stream. The result screen says so in one line ("Includes income not yet confirmed: ..."), so the date is never read as firmer than it is. Full what-if scenarios come with Level 3.

**A stream is paid from its start month and through its end month.** In its first and last years the engine counts only the months it is paid, so income that starts in July counts six months that year, and a benefit that runs through March counts three. Spending rows follow the same rule. A stream with no start has already started. Every stream on the entry screen, unemployment benefits included, offers "Already started" or "Starts in a coming month"; a stream with a future start adds nothing before that month.

**Supporting fields:**

| Field | Stored as | Default |
|---|---|---|
| Pay frequency | `weekly`, `biweekly`, `semimonthly`, `monthly` | `biweekly`, `roughly` |
| Pre-tax deductions | List. Workplace plan contributions (`401k`, `403b`): a percent of that stream's pay, plus the account type (`traditional` or `roth`). Others (`hsa`, `healthPremium`, `other`): an annual amount | None, or inferred from the gross and take-home reconciliation |
| Employer match | Percent matched, and cap as percent of pay | None |

**Workplace contributions are a percent of pay.** A contribution can be typed as a percent or as a dollar amount. Either way it is stored as a percent of that income stream's pay, so it scales automatically with raises. It stays in the account type the person chose (traditional or Roth) in every savings strategy. The savings waterfall only tops it up when the elected percent is below the employer's match cap, and the top-up goes to the same account type.

### 3.5 Spending (list)

Spending means **consumption only**. Debt payments live on debt rows. Saving and investing live on account rows. Counting them here would double count.

| Column | Value |
|---|---|
| Kind | Fact |
| Row | A category from `data/spending-categories.json`, and an optional name of the person's own (`label`, like "Rent"). Several rows can share a category, each with its own `start` and `end`, for a cost that changes on a date. The engine adds up every row active in a year |
| Unit | Dollars |
| Entered as | A list of rows, each in a category. One total is a single row under Everything else. Any row can add a start or an end, and a category can hold more than one amount. Transactions are Later |
| Stored as | Annual amount per category (smoothed, accrual basis) |
| Cadence | `start`, `end` (date, age, or `retirement`) |
| Continues in retirement | `yes`, `no`, or `changes` (with a retirement amount). Defaulted per category |
| Default | None. Required: a total or categories |
| Source | User |
| Confidence | `roughly` unless reconciled |
| Validation | Not negative. Proof of cash (below) |
| Growth | Real 0% (keeps pace with inflation) by default. Optional lifestyle creep (Later) |
| Feeds | The gap; savings rate; emergency fund target; retirement baseline; affordability checks; hours-costed conversions |

**Accrual, not cash.** A four-month bulk purchase or an annual subscription is spread evenly. The engine never sees lumpy months. The cash view (when money actually leaves) belongs to the Money Calendar, a Later view.

**Proof of cash.** Income minus taxes minus saving minus debt payments implies a spending number. If it differs from entered spending by more than 15%, the app flags it gently and asks which is right. People usually underestimate spending.

**One-total entry.** If only a total is given, it's stored as one `everythingElse` row with `continuesInRetirement: yes`. Categories can be split out later without losing the total.

**Tags (Later).** Each spending entry can carry `why`: `planned` (default), `unavoidable`, or `mistake`. Tags cross categories: a speeding ticket stays in Transportation and is tagged `mistake`.

### 3.6 Accounts: assets and debts (list)

Assets and debts share one list. Net worth is computed.

**Fields every account has:**

| Field | Stored as | Default |
|---|---|---|
| Name | Text | From preset |
| Institution | Text, optional | None |
| Preset | A key from `data/account-presets.json` | Required |
| Side | `asset` or `debt` | From preset |
| Balance | Dollars, with `asOf` | Required to answer; `roughly` allowed |
| Stress | 1 to 5, "how much does this weigh on you?" | Blank (not asked in round one) |

**Asset fields:**

| Field | Stored as | Default |
|---|---|---|
| Tax bucket | `cash`, `taxable`, `pretax`, `roth`, `hsa` | From preset |
| Liquidity | `now`, `days`, `penaltyBefore59Half`, `restricted` | From preset |
| Allocation | Percent stocks, bonds, cash | From preset, or quick picker: mostly stocks (90/10/0), balanced (60/40/0), mostly cash (0/0/100) |
| Annual contribution | Dollars per year | 0, or computed from deductions |
| Fees | Percent per year | From preset, editable |
| Cost basis | Dollars | Later |
| Holdings | List of tickers | Later |

**Debt fields:**

| Field | Stored as | Default |
|---|---|---|
| Rate | Percent per year | Required. A preset's typical rate is shown as a starting point marked `roughly`. With no preset rate, the debt is not complete until a rate is entered |
| Promo | Promo rate, promo end date (a month, the last one the promo rate applies), rate after | None. Offered on the entry screen when the rate is 0% |
| Minimum payment | Entered monthly, stored annual | Required. Until entered, the app shows an estimate (each month's interest plus 1% of the balance), marked `roughly` and flagged. It is never silently zero |
| Actual payment | Entered monthly, stored annual | Equal to minimum |
| Personal or business | Pick list, stored as `purpose`: `personal` or `business` | `personal` |
| Interest deductible | Yes or no | From preset |
| Forgiveness path | `none`, `idr`, `pslf` | Later |

**Validation.** Balance not negative (side carries the sign). Payment at least covers interest, or the app flags that the balance will grow. A 0% rate with no promo end date is flagged, because a 0% rate usually ends (it is allowed, for example on a family loan). In the year a promo ends, the months through the end month use the promo rate and the rest use the rate after. Tax bucket must match the preset family (a Roth 401(k) can't be `taxable`).

**Accounts the engine adds are never stored.** When a savings strategy needs an account the person has not listed, the engine uses an empty one from the preset for that run and flags it (engine spec section 4). The person's stored list is not changed.

**Entry order (flow, not data).** List accounts first, then balances. People know what accounts they have before they know the amounts.

**Feeds.** Starting balances; net worth; growth by asset class; withdrawal order and drawdown taxes; debt payoff schedule and the jump in the gap at payoff; payoff methods (Later); liquidity and emergency fund coverage.

### 3.7 HSA eligibility

| Column | Value |
|---|---|
| Kind | Fact |
| Unit | Yes or no |
| Stored as | Boolean |
| Cadence | Value with dated changes |
| Default | No, confidence `roughly` |
| Source | User |
| Relevance | Always asked once income exists |
| Feeds | The HSA step of the savings waterfall (engine spec section 4); HSA contribution limit |

Eligibility means being covered by a high-deductible health plan. The app explains that in plain words and asks yes or no.

**Inferred eligibility.** Entering an HSA payroll contribution counts as eligible, even if this question is still at its default of no. Nobody is asked the same thing twice.

---

## 4. Assumptions

Every assumption has a **low, likely, and high** value and a named **source**. The three values run as the three bands of the projection (worst, likely, best).

**No hidden padding.** The likely value is an honest best guess. Caution lives only in the low band, in plain view.

**Assumption sets.** Assumptions load together from a named set in `data/assumption-sets.json`. The default set is `historical`. Changing a single value records it as a user override.

### 4.1 Return by asset class

| Column | Value |
|---|---|
| Kind | Assumption |
| Unit | Real percent per year, per asset class (`stocks`, `bonds`, `cash`) |
| Default | From the active assumption set |
| Feeds | Growth on every asset account, blended by its allocation, minus its fees |

### 4.2 Inflation

| Column | Value |
|---|---|
| Kind | Assumption |
| Unit | Percent per year |
| Feeds | Nominal display; real erosion of fixed nominal amounts (fixed-rate debt payments, any nominal pension) |

Because the engine works in real dollars, inflation never touches returns or spending directly. It only matters for things that don't rise with prices.

### 4.3 Income growth

Real percent per year, set per income stream, defaulted by stream type from the active set.

### 4.4 Social Security

Social Security is a small model, not a single field.

| Part | Kind | Stored as | Default |
|---|---|---|---|
| Earnings record | Fact | Annual covered earnings by year | Estimated from income streams; sharpened with the person's ssa.gov record |
| Claiming age | Decision | Age in years and months | Full retirement age |
| Policy | Assumption | Percent of scheduled benefit paid | Likely 100%; adjustable down to the current-law floor |

The benefit is **computed**. Zero is not a band. A person can choose zero as an explicit override, stored as the decision `claimZero` (yes or no, default no), and the app shows what that choice costs in extra working years.

### 4.5 Plan-to age

| Column | Value |
|---|---|
| Kind | Assumption |
| Unit | Age in years |
| Default | 95 |
| Range | 85 to 100 |

This is the one place caution is intentional: outliving money is far worse than leaving some behind. The default is labeled as a safety choice, not a forecast.

### 4.6 Savings strategy

| Column | Value |
|---|---|
| Kind | Decision |
| Unit | Pick list: `maxTaxSavingsNow`, `maxTaxFreeGrowth`, `enteredOnly` |
| Default | `enteredOnly`, confidence `roughly` |
| Source | User |
| Relevance | Always |
| Feeds | The order of the savings waterfall (engine spec section 4, decisions E10 and E11) |

`enteredOnly` is what professional planning software does by default: it uses the contributions the person entered and sends the rest of the surplus to taxable. The other two strategies fill accounts to their legal limits. M2 adds "optimizer decides".

---

## 5. Goals

### 5.1 Retirement spending

Retirement spending is computed from three layers. Nobody types in a target.

**Layer 1. Baseline.** Every current spending category with `continuesInRetirement` of `yes` or `changes`.

**Layer 2. Life phases.** Tied to age, not years since retiring. Discretionary categories scale by phase. Essential categories don't. Healthcare is its own line.

| Phase | Default ages | Discretionary multiplier |
|---|---|---|
| Go-go | Retirement to 74 | 100% |
| Slow-go | 75 to 84 | 85% |
| No-go | 85 and up | 70% |

Phase ages and multipliers are defaults from decision D17 and are editable. They live in `data/life-phases.json`.

**Healthcare line.** Before 65, a pre-Medicare estimate (ACA-based in M2). From 65, a Medicare-based estimate. Values live in `data/` once sourced.

**Layer 3. Goal buckets (Later, shape settled now).**

| Field | Stored as |
|---|---|
| Name | Text |
| Cost | Dollars, one-off or annual |
| Age window | Start age and end age |
| Priority | `must`, `want`, `dream` |

When the plan is short, the engine trims `dream` first, then `want`, and protects `must`. When it has a surplus, it reports which additional goals are affordable and when. Price the Dream and Time Buckets are views of this list.

### 5.2 Retirement age

Not an input in M1. The skeleton's question is "when can I stop?", so retirement age is the **output** (the FI date). Later, a person can pin a target age, which turns the output into the gap.

---

## 6. Computed (never stored)

| Value | Computed from |
|---|---|
| Age (any year) | Birth date |
| Total income | Income streams |
| Take-home | Income, deductions, taxes |
| Taxes and effective rate | Income, filing status, state, deductions, tax tables |
| The gap | Take-home minus spending minus debt payments |
| Savings rate | Saving divided by take-home |
| Net worth | Accounts |
| Social Security benefit | Earnings record, claiming age, policy |
| Retirement spending by year | Baseline, phases, healthcare, goals |
| FI date (best, likely, worst) | Everything above, through the engine |

---

## 7. The household record

Everything above is stored together as one household.

| Field | Stored as | Meaning |
|---|---|---|
| `schemaVersion` | A whole number, currently 1 | The version of this dictionary's shape the household was saved in. Export files carry it, and import refuses a newer version than the app knows |
| `asOf` | `YYYY-MM-DD` | The plan date. The projection starts in this month (decision E8). It becomes today's date each time the app opens. Every stored value keeps its own `asOf`, the date it was true |
| `self`, `partner` | A person | Birth date, filing status, state, income, HSA eligibility, and the Social Security parts the person owns. `partner` is shape only in M1 (D18) |
| `spending`, `accounts` | Lists | Each is unanswered, answered "none", or answered with rows |
| `assumptions` | A set name plus overrides | The set's numbers are never copied in (D2) |
| `savingsStrategy` | Pick list | Section 4.6 |
| `goals` | List | Later |

**Kept from visit to visit.** Every change is saved in the browser as it is made, so entered numbers are there on the next visit. Each row has an id that never repeats, even across visits. Display choices (such as showing an amount per month) are remembered too, in a separate place, because they are not part of the plan. If the browser will not store anything, as in some private windows, the app says so and points to export.

**Export and import.** A household exports as a JSON file with a format name, a format version, the export date, and the household. Import checks the shape before anything changes and lists every problem in plain words.

**Older saved data is upgraded on load and on import.** When a field's stored shape changes (as workplace contributions did, from dollars to a percent of pay), the old shape is converted, so nothing a person saved stops working.

---

## 8. Level one checklist

The minimum set for M1. Everything else has a default.

| # | Input | Required | Default if blank |
|---|---|---|---|
| 1 | Birth date | Yes | None |
| 2 | State | Yes | None |
| 3 | Filing status | No | Single |
| 4 | Income streams | Yes (or "none") | None |
| 5 | Spending | Yes (total or categories) | None |
| 6 | Accounts and balances | Yes (or "none") | None |
| 7 | Returns | No | Historical set |
| 8 | Inflation | No | Historical set |
| 9 | Income growth | No | By stream type |
| 10 | Social Security | No | Estimated, 100% policy, full retirement age |
| 11 | Plan-to age | No | 95 |
| 12 | Retirement spending | No | Baseline plus phases |
| 13 | HSA eligibility | No | No |
| 14 | Savings strategy | No | Entered only |

Five answers produce a first FI date. Everything else sharpens it.

---

## 9. Proposed additions (October 2026, not yet reviewed by Eli)

**Status: Proposed.** Written during the 2026-10-04 overnight build (Phase 0b) to close six gaps found in the entity map. Nothing here is built until Eli confirms it. Each addition follows the rules in section 2: metadata on every value, parts not totals, ids that never repeat. Decisions are logged as X1 to X6 in `decisions.md`.

### 9.1 Income stream linked to its workplace plan

Today a workplace contribution (3.4) is a percent of pay on the income stream, and the engine finds the matching account by preset. That breaks when a person has two 401(k)s, or a 403(b) and a 457(b). The link makes it explicit.

| Field | On | Stored as | Default |
|---|---|---|---|
| `planId` | Each `WorkplaceContribution` | The id of a workplace plan (9.2) | The one plan whose employer matches the stream; if none, the engine adds an implicit plan and flags it |
| `destinationAccountId` | Each `WorkplaceContribution` | The id of the account the money lands in (traditional or Roth side of the plan) | The plan's account for the chosen `accountType` |

**Feeds:** which account grows; which plan's match applies; the rule of 55 (only the plan of the employer separated from); the 457(b) separate limit.

### 9.2 Workplace plan (new entity)

A plan is the employer's arrangement. Accounts hold money; the plan holds the rules. One plan can have two accounts (traditional and Roth).

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `id` | | Stable id | |
| `employerIncomeId` | Fact | The income stream of the employer | Required |
| `planType` | Fact | `401k`, `403b`, `457bGovernmental`, `457bNonGovernmental`, `tsp`, `simpleIra`, `sepIra`, `solo401k` | Required |
| `match` | Fact | `{ matchPercent, capPercentOfPay }` (moves here from the income stream, 3.4; the stream keeps a read-through for the migration) | None |
| `ruleOf55Allowed` | Fact | `yes`, `no`, `unknown` | `unknown`, shown as "check with your plan" |
| `megaBackdoorAllowed` | Fact | `yes`, `no`, `unknown` (after-tax contributions plus in-plan conversion or in-service withdrawal) | `unknown` |
| `rothOffered` | Fact | Boolean | `yes` |
| `accountIds` | | The accounts (3.6) that belong to this plan | |
| `separationAge` | Decision | Age in years, or `retirement` | `retirement` (M2 spec section 7, "planned separation age") |

**Validation.** `457bGovernmental` is the only plan type whose withdrawals skip the 10% additional tax and whose limit is separate from the 401(k)/403(b) limit (`limits.457b.2026`). A `solo401k` requires a self-employed income stream. **Feeds:** the savings waterfall steps 1, 4, 5, 7; rule of 55; 457(b) early access; the mega backdoor room (total additions limit minus employee and employer amounts).

### 9.3 Business (new entity)

Self-employed and side-gig income (3.4), business expenses, and business debts (3.6, `purpose: business`) today sit on separate rows with nothing tying them together. A business groups them so the engine can compute net profit, self-employment tax, the QBI deduction (M2+), and solo 401(k) room from one place.

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `id` | | Stable id | |
| `name` | Fact | Text | "My business" |
| `entityType` | Fact | `soleProprietor`, `singleMemberLlc`, `partnership`, `sCorp`, `cCorp` | `soleProprietor`, `roughly` |
| `incomeIds` | | Income streams of type `selfEmployed` or `sideGig` | |
| `expenseAnnual` | Fact | Annual dollars (moves here from `businessExpensesAnnual` on the stream; the stream keeps a read-through) | 0 |
| `debtIds` | | Accounts with `purpose: business` | |
| `ownerSalary` | Fact | Annual dollars, S corporations only (strategy F3) | None |
| `stateOfFormation` | Fact | State code | The person's state |

**Rule to carry into the engine (from the SPARKS catalog correction):** forming an entity in another state does not change where income is taxed; residence and where the work is done decide. The field is for record-keeping, not for a tax effect. **Feeds:** self-employment tax; QBI (M2+); solo 401(k) and SEP room; the Self-employed pack.

### 9.4 Account owner

| Field | On | Stored as | Default |
|---|---|---|---|
| `owner` | Every account (3.6) and every workplace plan (9.2) | `self`, `partner`, `joint` | `self` |

**Validation.** Retirement accounts (pretax, Roth, HSA) and workplace plans cannot be `joint`. `partner` requires a partner record (2.7). **Feeds:** whose age decides penalties, RMDs, and catch-ups; whose Social Security record; the household-of-two tax split; the Partner pack.

### 9.5 Scenario blocks (layered proposed changes)

A scenario block is a set of proposed changes laid over the real rows. The real rows are never edited by a block; the engine applies the block's changes in memory when a scenario is run (Level 3, section 2).

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `id` | | Stable id | |
| `type` | Goal | `home`, `car`, `kid`, `jobChange`, `sabbatical`, `geoArbitrage`, `sideHustle`, `inheritance`, `marriage`, `custom` | Required |
| `name` | Goal | Text | From type |
| `startDates` | Goal | One or more `YYYY-MM`, so one block can compare timings | Required |
| `changes` | Goal | A list of `{ target, op, value, start, end }` where `target` is a row id or a new-row spec, `op` is `add`, `replace`, `remove`, or `scale`, and dates follow 2.6 | Required |
| `confidence` | | Per change, from the questionnaire's national or state default, or a quote | `roughly` |
| `relation` | Goal | `inAdditionTo` or `replacing` another block's id | None |
| `enabled` | Goal | Boolean | `true` |

**Rules.** Blocks stack in list order. Adding a block asks the person to reconfirm related blocks; nothing changes automatically. The headline for every block is the change in monthly cash flow and the FI date moved. **Feeds:** M5 what-ifs, the price card, best timing, milestones.

### 9.6 Roth conversion record

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `id` | | Stable id | |
| `fromAccountId` | Fact | A pretax account | Required |
| `toAccountId` | Fact | A Roth account | Required |
| `amount` | Fact | Dollars (the taxable part; a nondeductible basis part is stored separately as `basisPart`) | Required |
| `month` | Fact | `YYYY-MM` | Required |
| `clockStart` | Computed | January 1 of the conversion year; the five-year clock ends December 31 four years later (`access.rothOrdering`) | Never stored |

Past conversions are facts the person enters. Future conversions are decisions the optimizer proposes, stored as year-by-year locks (M2 spec section 5) and never as conversion records until they happen. **Feeds:** Roth ordering (A1, A2), MAGI for ACA and IRMAA in the conversion year, the conversion ladder.

### 9.7 Small wins answers

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `smallWins` | Decision | A map from win id (`data/small-wins.json`) to `done`, `notForMe`, or `later`. A win not in the map is open | Empty |

**Feeds:** the Small wins running total and its promotion to the main path (M3 spec section 10). The dollar values are never stored; they are recomputed from the win definitions and the household's spending each time.

### 9.8 Resilience inputs (Level 2)

Stored under `resilience`. Every field has a default, so nothing is required.

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `incomeStability` | Goal | `steady`, `normal`, `variable` | `normal` |
| `monthsToClose` | Goal | Months | 12 |
| `unemploymentEligible` | Fact | Boolean | From the income type (W-2 yes, self-employed and gigs no) |
| `severanceWeeks` | Fact | Weeks of pay | 0 |
| `disability` | Fact | `{ replacesPercentOfPay, waitingWeeks }` | Unsure (shown at 60% and 13 weeks) |
| `dependents` | Fact | Count | 0 |
| `extraMustPaysAnnual` | Fact | Dollars a year | 0 (health insurance, phone, and debt minimums come from the rows) |
| `breakGlass` | Decision | Boolean | No |

**Feeds:** the Rule of 5, the staircase, the runway stack, the shock tests, the walk-away and business milestones.

### 9.9 Milestone settings (Level 3)

Stored under `milestones`, each with its default from `data/milestones.json` (G5): `coastAge` 65, `baristaIncomeAnnual` 20,000, `fatFiMultiplier` 1.5, `flexFiTrimPercent` 10, `slowFiTargetAge` (FI plus 5), `walkAwayMonths` 12, `businessRunwayMonths` 12.

### 9.10 Legacy inputs (Level 5)

Stored under `legacy`.

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `projects` | Goal | List of `{ id, name, type, oneOffCost, annualCost, hoursPerWeek, startAge, horizonYears }` | None |
| `breathingRoomPercent` | Goal | Percent of the FI number | 10 |
| `basics` | Fact | `beneficiaries`, `will`, `healthcareProxy`, `powerOfAttorney`, each yes, no, or unsure | Unsure |
| `freeHoursPerWeek` | Assumption | Hours | 45 |

A goal bucket (5.1) gains an optional `legacy` tag; a tagged dream appears among the projects while keeping its price card. The heir tax rate lives with the drawdown inputs (M2 spec section 7). Annual giving is read from the giving spending category, never stored twice.

### 9.11 Risk settings (M6)

Stored under `risk`: `successThresholdPercent` (Goal, default 90) and `guardrailsOn` (Decision, default off). The Flex FI trim lives with the milestone settings (9.9).
