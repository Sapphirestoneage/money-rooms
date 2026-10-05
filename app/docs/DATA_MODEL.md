# Data model

## 1. Principles

- **Four separate drawers**: facts, assumptions, goals, scenarios. A drawer never writes into another. Scenarios never overwrite facts; they overlay them (`ARCHITECTURE.md` section 4).
- **Derived values are never stored.** Anything a metric can compute is computed; the file holds inputs only. Published outputs live in memory on the hub.
- **Store birth date, not age.** Age is computed at an as-of date.
- **Households of one or two people.** Every person-level fact names its person; household-level facts name the household.
- **Every input has a status** and **every number carries metadata** (section 3).
- **Real dollars by default.** Nominal only at display time, from the assumptions drawer's inflation.

## 2. Entities and owners

| Entity | Fields (facts) | Owner planet |
|---|---|---|
| Client | id, label (a nickname, never a legal name), createdAt, notes | Sun |
| Household | people (one or two), filingStatus, state, localTaxPercent | Sun |
| Person | id, birthDate (year and month), role (self, partner) | Sun |
| Income stream | personId, type (salary, hourly, self-employed, side gig, benefits, support, other), grossMonthly, takeHomeMonthly (either or both; the app solves the other), stability (steady, variable, seasonal, uncertain), start, end | Income |
| Spending bucket | category (from the bucket list), monthly amount, as a total or detail lines | Spending |
| Debt | label, kind (card, student, auto, mortgage, family, medical, other), balance, ratePercent, promo (rate, endDate, rateAfter), minimumMonthly, actualMonthly, stressRating (1 to 5), flexibility (fixed, flexible, pausable) | Debt |
| Emergency reserve settings | incomeStability, monthsToClose | Safety Net |
| Account | label, taxBucket (cash, taxable, pretax, roth, hsa, education, property), liquidityTier (now, days, restricted, penalized), balance, annualContribution, employerMatch | Investments and Accounts |
| Tax facts | filing status and state live on the household; withholding and estimated payments (later) | Taxes |
| Event or goal | label, kind (event, goal), date or age, cost (one-off or monthly), duration, priority | Life Plan |

Moons are subtopics of a planet and own nothing of their own (a 401(k) is an Account; a promo rate is a field on a Debt).

## 3. Status and metadata

Every input is an `Input<T>`:

```
{ status, value?, asOf?, source?, precision?, note? }
```

| Status | Meaning | Counts as complete? | Downstream |
|---|---|---|---|
| `empty` | Not asked or not answered yet. | No | Metrics wait (or default, or zero, as declared). |
| `unknown` | Asked; the client does not know. | No | Same as empty, but the one-pager shows "unknown" not "missing". |
| `rough` | A ballpark. | Yes | Metrics compute; the result is marked rough. |
| `entered` | A number the client gave. | Yes | Metrics compute. |
| `verified` | Confirmed against a document. | Yes | Metrics compute. |
| `none` | Genuinely zero. | Yes | Treated as 0; never marked rough. |
| `notApplicable` | This does not exist for this client. | Yes | Removes the input and everything downstream of it that depends only on it (metrics report `notApplicable`). |

Metadata on every number: `asOf` (an ISO date), `source` (client, coach, statement, estimate, default), `precision` (exact, rounded, rough, order of magnitude). A value with no `asOf` is treated as of the file's `updatedAt` and flagged.

**Summary or detail.** Any number can be a single rough total or built from detail lines. A `Composite` input holds `total` and `lines`; when any line is complete, the detail wins and the total is ignored. When no line is complete, the total is used. Missing lines follow the metric's missing policy.

## 4. Drawers

| Drawer | Holds | Written by |
|---|---|---|
| `facts` | The entities above. | The owner planet, through the Ledger only. |
| `assumptions` | Three cases (realistic, likely, unrealistic): real return by asset class, inflation, income growth, plan-to age. The active case. Dollars: real by default. | The coach, through the assumptions drawer; never by a planet. |
| `goals` | Events and goals with dates and costs. | Life Plan, through the Ledger. |
| `scenarios` | Named overlays: a list of `{ path, value }` changes on top of facts, goals, or assumptions. | The simulator; promoted through the Ledger. |

## 5. The file

```
{
  "schemaVersion": 1,
  "app": "money-rooms-v1",
  "client": { "id", "label", "createdAt", "notes" },
  "updatedAt": "YYYY-MM-DD",
  "household": { "people": [...], "filingStatus", "state", "localTaxPercent" },
  "drawers": { "facts": {...}, "assumptions": {...}, "goals": [...], "scenarios": [...] },
  "ledger": [ { "id", "at", "by", "path", "from", "to", "why", "owner" } ],
  "snapshots": [ { "takenAt", "reason", "file": <the file before the change, without its own snapshots> } ]
}
```

`schemaVersion` is checked on every load; `core/schema.ts` migrates older versions forward, one step at a time, and refuses a newer version than it knows.

## 6. Where files live

One client per JSON file, in a folder the coach chooses outside the repo. The console exports and imports; the browser's own storage is a working copy only. Nothing under `/clients/` and nothing matching `*.client.json` is ever committed: `.gitignore` excludes both, and the pre-commit hook (`scripts/check-no-client-files.mjs`) refuses a commit that stages either.
