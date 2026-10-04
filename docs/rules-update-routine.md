# Rules update routine

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build. A routine, not code.

---

## 1. Why a routine

Every tax and benefit number the engine uses lives in `data/rules-registry.json` or `data/tax/<year>.json`, with a source, a URL, and a `lastVerified` date. The M2 engine refuses a rule with no verified date. That design only works if someone re-verifies on a schedule and when the law moves. This is that schedule.

## 2. The calendar

| When | What | Who |
|---|---|---|
| **Late October to mid November, every year** | The IRS inflation adjustments (the revenue procedure with brackets, standard deduction, capital gains thresholds, the senior deduction phase-out) and the retirement plan limits notice. Social Security's COLA fact sheet (wage base, bend points, earnings test). Medicare Part B and D premiums and the IRMAA tiers (CMS). | Eli, or a session with network access to irs.gov, ssa.gov, cms.gov |
| **January** | The poverty guidelines (HHS), which the ACA table for the next coverage year reads. The ACA applicable percentage table for the year (IRS). | Same |
| **When a law passes** | Anything the bill touches. Add the rule's `effective` years and `sunset`, set `status` to `sunsetting` or `watch` as the text says, re-verify the URL. | Same |
| **Monthly** | A check of the whole registry against its sources, with a report: open every URL, confirm the value, note any page that moved or could not be reached. The report is `docs/rules-verification-<year>-<month>.md`; a month with no changes still gets a one-line report saying so. | Eli (owner, decided 2026-10-04); a scheduled session may draft the report |
| **Quarterly** | The 72(t) rate inputs (federal mid-term rate), the `watch` list (rules with a `status` of watch), and the state tables for states that changed their brackets. | Same |
| **Each session that touches a rule** | Re-open the source, confirm, update `lastVerified`. Never bump the date without opening the page. | Whoever touches it |

## 3. The steps, every time

1. Open the source URL in the registry entry. If the page moved, find the new one and update `url`.
2. Compare every value in the entry with the page. Record the check in `docs/rules-verification-<year>-<month>.md` in the format of `docs/rules-verification-2026-10.md` (rule, value before, value after, source, date).
3. Change the value in `data/`, never in engine code. If the shape changes (a new tier, a new bracket), update the data dictionary first.
4. Set `lastVerified` to today. If the page could not be reached, leave the old date, add a line to the verification doc with the URL, and move on (build rule 9).
5. Run the full suite and the Maya tie-out. The tie-out is pinned to 2026 tables and must not move; if a new-year table is added, it is a new file, `data/tax/2027.json`, and the tie-out keeps reading 2026.
6. Commit with a plain-English message naming the rule ("Update the 2027 standard deduction from Rev. Proc. 2026-xx").

## 4. What the app shows

- Every result lists the rules it used with their verified dates (the "Rules behind this plan" section).
- A rule verified more than 15 months before the plan date is flagged on every result that uses it ("was last checked on ..., more than 15 months ago"), and never refused (decision F7). This is the trigger the routine missed.
- A `sunsetting` rule shows in "Rules that could change" with its sunset year; the stress test runs the plan without it.

## 5. The yearly table roll

When a new tax year's values arrive, add `data/tax/<year>.json`, keep the prior year's file untouched, and point `defaultDeps()` at the new year once every value in it is verified. The data dictionary's section on tax tables names the fields a year file must carry. Partial years are not allowed: a year file with a blank value fails `loadTaxTables`.

## 6. Answered at review (2026-10-04)

1. Eli owns the routine. A scheduled session may open the pages and draft the verification doc for his review.
2. A rule verified more than 15 months ago is flagged on every result that uses it, never refused (built as `RuleLedger.stale` and a timeline flag; decision F7).
