# Import template

A spreadsheet-shaped file a person, or any AI that knows their finances, can fill in and hand to Money Rooms. This document is the source of truth for the template (`templates/money-rooms-template.csv`), the prompt (`templates/ai-fill-prompt.txt`), and the importer (`engine/transfer/template.ts`).

The file is read in the browser only. It is never sent anywhere.

---

## 1. The format

CSV, UTF-8, one row per value. The first row is the header. Columns, in this order:

```
section,item,field,value,cadence,kind,as_of,notes
```

| Column | Meaning |
|---|---|
| `section` | `profile`, `income`, `spending`, `account`, `debt`, or `optional` |
| `item` | A name grouping rows that belong together (for example "Day job", "Ally savings"). For `profile` and `optional`, leave blank |
| `field` | One of the allowed fields for that section (section 2) |
| `value` | The number or choice. Numbers without $ or commas. Percents as plain numbers (4 means 4%). Dates as YYYY-MM |
| `cadence` | For dollar amounts only: `week`, `paycheck`, `month`, or `year`. Blank otherwise |
| `kind` | `known`, `roughly`, `lookup`, or `dontknow`. `dontknow` rows are skipped on import and listed for later |
| `as_of` | YYYY-MM the value was true. Optional |
| `notes` | Free text. Ignored by the importer |

**Rules the importer applies**

- A row with a blank `section` is a notes row and is ignored. The template's first row after the header is one.
- A value that contains a comma or a quote is wrapped in double quotes, the usual CSV way.
- Section, field, cadence, kind, and choice values are not case sensitive. Item names keep their capitals.
- A recurring dollar amount needs a cadence. A balance is not recurring and takes none.
- `paycheck` uses that income's `pay_frequency`. If none is given, every two weeks is assumed.
- A blank `kind` means `known`. A blank `as_of` means the month of import.
- A row that can't be read is never imported. It is listed with a plain reason, and the rest of the file still loads.

---

## 2. Allowed fields

### profile

| Field | Value | Data dictionary |
|---|---|---|
| `birth_month` | YYYY-MM | 3.1 Birth date |
| `state` | 2-letter code | 3.3 State of residence |
| `filing_status` | `single`, `married_joint`, `married_separate`, `head_of_household` | 3.2 Filing status |

### income (one item per source of income)

| Field | Value | Data dictionary |
|---|---|---|
| `type` | `salary`, `hourly`, `self_employed`, `side_gig`, `unemployment`, `allowance`, `other` | 3.4 Row type |
| `gross_amount` | Dollars, with a cadence | 3.4 Stored as annual gross dollars |
| `hours_per_week` | 1 to 80 | 3.4 Hours per week |
| `pay_frequency` | `weekly`, `biweekly`, `semimonthly`, `monthly` | 3.4 Pay frequency |
| `match_percent` | Percent of the contribution the employer matches | 3.4 Employer match, percent matched |
| `match_cap_percent` | The match stops at this percent of pay | 3.4 Employer match, cap as percent of pay |
| `contribution_percent` | The person's 401(k) or 403(b) contribution, percent of pay | 3.4 Pre-tax deductions, workplace contribution |
| `contribution_type` | `traditional` or `roth` | 3.4 Workplace contribution account type |
| `hsa_contribution` | Dollars through payroll, with a cadence | 3.4 Pre-tax deductions, `hsa` |
| `business_expenses` | Dollars, with a cadence | 3.4 Business expenses |
| `start` | YYYY-MM. Leave the row out if the income has already started | 2.6 and 3.4 Cadence, `start` |
| `end` | YYYY-MM, `age:NN`, or `retirement` | 2.6 and 3.4 Cadence, `end` |

An income needs its `type` row. Everything else is optional. Match needs both `match_percent` and `match_cap_percent`.

### spending (one item per amount; the item is the person's own name for it)

| Field | Value | Data dictionary |
|---|---|---|
| `category` | A category id from `data/spending-categories.json` | 3.5 Row, category |
| `amount` | Dollars, with a cadence | 3.5 Annual amount |
| `start` | YYYY-MM. Leave the row out if the spending already counts | 2.6 and 3.5 Cadence, `start` |
| `end` | YYYY-MM, `age:NN`, or `retirement`. Leave the row out if it does not end | 2.6 and 3.5 Cadence, `end` |

A spending item needs its `category` and `amount` rows. Several items can share a category with different dates, for a cost that changes on a date: healthcare at $0 with `end` 2027-06, and healthcare at $800 a month with `start` 2027-07. The engine adds up every row active in a year, counting the months each one covers, so dates in one category should not overlap. An item whose amount is marked `dontknow` is left out and listed to look up later.

A file made before the `category` field existed (the item is the category id, with only an `amount` row) still imports.

Category ids come from `data/spending-categories.json`: `accommodation`, `utilities`, `food`, `transportation`, `insurance`, `healthcare`, `therapy`, `phone`, `subscriptions`, `personal`, `fun`, `travel`, `giving`, `pets`, `education`, `workCosts`, `everythingElse`. To give one total, use `everythingElse`. Spending is consumption only: no debt payments, no saving.

### account (one item per account owned)

| Field | Value | Data dictionary |
|---|---|---|
| `type` | `checking`, `savings`, `brokerage`, `trad_401k`, `roth_401k`, `trad_ira`, `roth_ira`, `hsa`, `other` | 3.6 Preset |
| `balance` | Dollars, no cadence | 3.6 Balance |
| `mix` | `mostly_stocks`, `balanced`, `mostly_cash` | 3.6 Allocation, quick picker |

### debt (one item per debt owed)

| Field | Value | Data dictionary |
|---|---|---|
| `type` | `credit_card`, `business_card`, `student_federal`, `student_private`, `auto`, `mortgage`, `personal`, `family`, `medical`, `other` | 3.6 Preset |
| `balance` | Dollars owed, no cadence | 3.6 Balance |
| `rate` | Percent per year. With a promo, this is the promo rate | 3.6 Rate, and 3.6 Promo rate |
| `promo_end` | YYYY-MM. The last month the promo rate applies | 3.6 Promo end date |
| `rate_after` | Percent per year once the promo ends | 3.6 Promo, rate after |
| `min_payment` | Dollars, with a cadence | 3.6 Minimum payment |
| `actual_payment` | Dollars, with a cadence | 3.6 Actual payment |

A promo needs all three rows: `rate`, `promo_end`, and `rate_after`. A debt with a rate of 0 and no `promo_end` is imported as 0% for good and is listed in the preview under "Needs a look", because a 0% rate usually ends.

A debt with no `rate` row gets its type's typical rate marked roughly, or must have the rate entered in the app before a plan runs. A debt with no `min_payment` row gets the app's estimate, marked roughly (decision E17).

### optional

| Field | Value | Data dictionary |
|---|---|---|
| `hsa_eligible` | `yes` or `no` | 3.7 HSA eligibility |
| `ss_claim_age` | A whole age from 62 to 70 | 4.4 Social Security, claiming age |

---

## 3. What `kind` becomes

| kind | In the app |
|---|---|
| `known` | Known |
| `roughly` | Roughly |
| `lookup` | Look it up |
| `dontknow` | Not imported. Listed under "to look up later". If it was an amount on an item that otherwise exists (an account with no balance, an income with no amount), the item is created with a blank amount marked Look it up |

Birth month is always stored as Known (data dictionary 3.1).

---

## 4. Importing

1. The person drops the file on "Import from a template", or chooses it. The same card hands out the blank template and the AI prompt ("Get the template", "Get the AI prompt").
2. The app shows a preview and changes nothing yet: how many items each section has, the rows that need a look with a plain reason for each ("Ally savings: balance '20k' isn't a number"). A row that could not be read is not imported, and the rows to look up later.
3. Apply replaces the household. A snapshot of what was there is kept first, so the import can be undone.

---

## 5. Exporting

"Export as template" writes the current household in this same format, so it can be edited in a spreadsheet and imported again.

- Recurring amounts are written per year.
- A value that is still the app's own default (a preset's rate, an estimated payment, the default filing status) is left out, so it stays a default after re-import.
- Importing an exported template gives back the same household. One exception: a second unnamed amount in the same spending category comes back with a name ("Food 2").

**What the template does not carry.** Savings strategy, assumption set and overrides, the Social Security zero override, edited fees, and custom allocations. The full export ("Export my numbers", a JSON file) carries everything and is the one to use as a backup.

---

## 6. Privacy

- Filled files hold real balances and income. They never belong in the repository.
- `.gitignore` blocks `*-filled.csv`, `my-*.csv`, `household-*.csv`, and anything in a folder named `private/`. The app names its own template export `my-money-rooms-YYYY-MM-DD.csv` so it is covered.
- The two files in `templates/` contain example numbers only (Maya, an invented household).
