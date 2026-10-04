# Progress history spec

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build, in the format of `m3-spec.md`, then built on branch `foundations`.

---

## 1. The idea in one paragraph

A plan that only shows today cannot show progress. This spec adds a progress history: one small snapshot a day, taken when the result screen runs, holding the date, the FI date in each band, net worth, the savings rate, and the FI number. It lives with the household (so it is in every export and leaves with a delete), never leaves the browser, and is read back as one trend sentence ("Since July, your likely FI date moved a year earlier and your net worth rose $12,400") and a short table.

---

## 2. What is stored

A snapshot is a derived value frozen at a date. The rule "never persist a value the engine can derive" has one honest exception: a value from a past date can no longer be derived once the inputs have changed, so it has to be kept. That is the only reason this record exists.

| Field | Kind | Stored as | Notes |
|---|---|---|---|
| `date` | Record | `YYYY-MM-DD` | The plan date the snapshot was taken on |
| `fiYear.best`, `fiYear.likely`, `fiYear.worst` | Computed, frozen | Calendar year or null | The first year with no work income in each band; null when never funded |
| `fiAge.likely` | Computed, frozen | Years or null | Age at the likely FI date, for the sentence |
| `netWorth` | Computed, frozen | Dollars | Assets less debts from the entered balances on that date |
| `savingsRatePercent` | Computed, frozen | Percent or null | Contributions (less the employer match) over take-home pay in the first full working year of the likely band |
| `fiNumber` | Computed, frozen | Dollars | 25 times current annual spending (the Gross FI number). The True FI number needs the optimizer and is not frozen here |
| `conventions` | Record | `m1` or `m2` | Which engine mode produced it |

Stored under `household.history` (dictionary 9.12). At most one snapshot per date: a second run on the same day replaces the first. The list is capped at 400 entries (about a year of daily visits); the oldest go first, except the very first, which is kept as the starting point.

## 3. When a snapshot is taken

When the result screen runs a complete household. Never on the entry screen (numbers are mid-edit there), never in a what-if (blocks are not the real plan), never when the household is incomplete.

## 4. The trend sentence

Compare the latest snapshot with the earliest one at least 28 days older, or the earliest of all when the history is shorter than that. One sentence, in the style guide's voice, describing what moved:

- The likely FI date: "moved a year earlier", "moved two years later", "has not moved", or "is now funded" when it went from null to a year.
- Net worth: "rose $12,400" or "fell $3,100" (under $100 is "held steady").
- The savings rate: "and your savings rate went from 22% to 25%" when it changed by at least a point.

With one snapshot the sentence is "This is the first snapshot of your plan. Come back to see how it moves." The sentence never praises or scolds.

## 5. Where it shows

A "Your progress" section on the result screen, in the rearrangeable order, after the flags by default: the trend sentence with a Computed badge, then a dense table of the last eight snapshots (date, likely FI age, net worth, savings rate). A quiet "Clear history" button with the confirm panel.

## 6. Engine pieces

`engine/history/snapshots.ts`: `snapshotFrom(household, projection, today)`, `addSnapshot(history, snapshot)`, `trendSentence(history)`, `trendBetween(a, b)`. Pure. Tests in `engine/history/history.test.ts`.

## 7. Acceptance tests

1. Two runs on the same date leave one snapshot for that date, the later one.
2. Snapshots are in the export and come back on import.
3. The trend sentence compares against a snapshot at least 28 days old when one exists.
4. The sentence says "has not moved" when the FI year is unchanged, and names the direction otherwise.
5. The cap keeps the first snapshot and the newest 399.

## 8. Not in this version

Charts of the history (a sparkline is a natural next step), snapshots from what-ifs, a snapshot of the True FI number, syncing.
