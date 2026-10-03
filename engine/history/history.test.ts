/** Progress history (docs/history-spec.md acceptance tests). */

import { describe, expect, it } from "vitest";
import { exportToJson, importFromJson, project, type Household, type ProgressSnapshot } from "../index";
import { householdFromExample, type ExampleHouseholdFile } from "../model";
import maya from "../../tests/households/maya.json";
import { HISTORY_CAP, addSnapshot, snapshotFrom, trendBaseline, trendBetween, trendSentence } from "./snapshots";

const snap = (date: string, likely: number | null, netWorth: number, rate: number | null = 20): ProgressSnapshot => ({
  date,
  fiYear: { best: likely === null ? null : likely - 2, likely, worst: likely === null ? null : likely + 3 },
  fiAge: { likely: likely === null ? null : likely - 1990 },
  netWorth,
  savingsRatePercent: rate,
  fiNumber: 1_000_000,
  conventions: "m2",
});

describe("snapshots", () => {
  it("builds today's snapshot from Maya's projection", () => {
    const h: Household = householdFromExample(maya as unknown as ExampleHouseholdFile, "2026-10-03");
    const s = snapshotFrom(h, project(h), "2026-10-03");
    expect(s.date).toBe("2026-10-03");
    expect(s.fiYear.likely).not.toBeNull();
    expect(s.fiAge.likely).toBeGreaterThan(30);
    // Maya owes more than she holds at the start, so net worth is negative here; it only has to be a finite number.
    expect(Number.isFinite(s.netWorth)).toBe(true);
    expect(s.netWorth).toBeLessThan(0);
    expect(s.savingsRatePercent).toBeGreaterThan(0);
    expect(s.fiNumber).toBeGreaterThan(0);
    expect(s.conventions).toBe("m2");
  });

  it("keeps one snapshot per date, the later run winning (test 1)", () => {
    const h = addSnapshot(addSnapshot([], snap("2026-10-03", 2040, 100)), snap("2026-10-03", 2039, 120));
    expect(h).toHaveLength(1);
    expect(h[0]!.netWorth).toBe(120);
  });

  it("sorts by date and keeps the first snapshot when capped (test 5)", () => {
    let h: ProgressSnapshot[] = [];
    for (let i = 0; i < HISTORY_CAP + 10; i++) {
      const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      h = addSnapshot(h, snap(d, 2040, i));
    }
    expect(h).toHaveLength(HISTORY_CAP);
    expect(h[0]!.date).toBe("2026-01-01");
    expect(h[h.length - 1]!.netWorth).toBe(HISTORY_CAP + 9);
  });

  it("survives the export and import round trip (test 2)", () => {
    const h: Household = householdFromExample(maya as unknown as ExampleHouseholdFile, "2026-10-03");
    h.history = [snap("2026-09-01", 2041, 50_000), snap("2026-10-03", 2040, 62_000)];
    const back = importFromJson(exportToJson(h, "2026-10-03"));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.household.history).toEqual(h.history);
  });
});

describe("the trend sentence", () => {
  it("has a first-visit line", () => {
    expect(trendSentence([snap("2026-10-03", 2040, 100)])).toMatch(/first snapshot/);
    expect(trendSentence([])).toBe("No snapshots yet.");
  });

  it("compares against a snapshot at least 28 days old when one exists (test 3)", () => {
    const h = [snap("2026-07-01", 2042, 40_000), snap("2026-09-20", 2041, 50_000), snap("2026-10-03", 2040, 62_400)];
    expect(trendBaseline(h)!.date).toBe("2026-07-01");
    const short = [snap("2026-09-20", 2041, 50_000), snap("2026-10-03", 2040, 62_400)];
    expect(trendBaseline(short)!.date).toBe("2026-09-20");
  });

  it("names the direction, or says the date has not moved (test 4)", () => {
    expect(trendBetween(snap("2026-07-01", 2042, 40_000, 22), snap("2026-10-03", 2040, 52_400, 25))).toBe("Since July 2026, your likely FI date moved 2 years earlier, your net worth rose $12,400, and your savings rate went from 22% to 25%.");
    expect(trendBetween(snap("2026-09-20", 2040, 50_000), snap("2026-10-03", 2040, 50_050))).toBe("Since September 20, your likely FI date has not moved, and your net worth held steady.");
    expect(trendBetween(snap("2026-09-01", null, 50_000), snap("2026-10-03", 2045, 48_000))).toMatch(/is now funded, and your net worth fell \$2,000\./);
    expect(trendBetween(snap("2026-09-01", 2040, 50_000), snap("2026-10-03", 2041, 50_000))).toMatch(/moved a year later/);
  });

  it("never instructs or judges", () => {
    const text = trendBetween(snap("2026-07-01", 2042, 40_000, 22), snap("2026-10-03", 2040, 52_400, 25));
    for (const bad of ["should", "must", "great", "bad", "good job", "congratulations", "fail"]) expect(text.toLowerCase()).not.toContain(bad);
  });
});
