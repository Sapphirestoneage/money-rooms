import { describe, expect, it } from "vitest";
import {
  ASSET_CLASSES,
  INCOME_GROWTH_TYPES,
  defaultAssumptionSetKey,
  defaultHouseholdAssumptions,
  isAssumptionSetKey,
  listAssumptionSets,
  loadAssumptionSet,
  loadLifePhases,
  parseBand,
  pickBand,
  planToAgeBounds,
  resolveAssumptions,
} from "./assumptions";
import { userValue } from "./values";

describe("bands", () => {
  it("accepts ordered triples and rejects anything else", () => {
    expect(parseBand([4, 6.5, 8.5], "t")).toEqual([4, 6.5, 8.5]);
    expect(parseBand([1, 1, 1], "t")).toEqual([1, 1, 1]);
    expect(() => parseBand([8.5, 6.5, 4], "t")).toThrow(/ordered/);
    expect(() => parseBand([1, 2], "t")).toThrow();
    expect(() => parseBand("x", "t")).toThrow();
  });

  it("picks each end", () => {
    expect(pickBand([1, 2, 3], "low")).toBe(1);
    expect(pickBand([1, 2, 3], "likely")).toBe(2);
    expect(pickBand([1, 2, 3], "high")).toBe(3);
  });
});

describe("assumption sets file", () => {
  it("names a default that exists", () => {
    expect(isAssumptionSetKey(defaultAssumptionSetKey())).toBe(true);
    expect(defaultAssumptionSetKey()).toBe("historical");
  });

  it("resolves every set fully, with ordered bands", () => {
    for (const { key } of listAssumptionSets()) {
      const set = loadAssumptionSet(key);
      for (const cls of ASSET_CLASSES) expect(set.returns[cls]).toHaveLength(3);
      for (const type of INCOME_GROWTH_TYPES) expect(set.incomeGrowth[type]).toHaveLength(3);
      expect(set.inflation).toHaveLength(3);
      expect(set.socialSecurityPolicy).toHaveLength(3);
    }
  });

  it("lets a set inherit what it does not override", () => {
    const historical = loadAssumptionSet("historical");
    const mmm = loadAssumptionSet("mmm");
    expect(mmm.returns.stocks).toEqual([3, 5, 7]);
    expect(mmm.returns.bonds).toEqual(historical.returns.bonds);
    expect(mmm.inflation).toEqual(historical.inflation);
    expect(mmm.incomeGrowth.salary).toEqual(historical.incomeGrowth.salary);
  });

  it("keeps Social Security likely at the full scheduled benefit (D14)", () => {
    expect(pickBand(loadAssumptionSet("historical").socialSecurityPolicy, "likely")).toBe(1);
  });

  it("rejects unknown sets", () => {
    expect(() => loadAssumptionSet("nope")).toThrow(/Unknown assumption set/);
  });

  it("has plan-to age bounds with 95 as the default (D15)", () => {
    expect(planToAgeBounds()).toEqual({ default: 95, min: 85, max: 100 });
  });
});

describe("life phases file (D17)", () => {
  it("loads three contiguous phases from retirement to open-ended", () => {
    const phases = loadLifePhases();
    expect(phases.map((p) => p.id)).toEqual(["goGo", "slowGo", "noGo"]);
    expect(phases[0]).toMatchObject({ startAge: null, endAge: 74, discretionaryMultiplier: 1 });
    expect(phases[1]).toMatchObject({ startAge: 75, endAge: 84, discretionaryMultiplier: 0.85 });
    expect(phases[2]).toMatchObject({ startAge: 85, endAge: null, discretionaryMultiplier: 0.7 });
  });
});

describe("resolving a household's assumptions", () => {
  const asOf = "2026-10-02";

  it("starts from the default set with no overrides", () => {
    expect(defaultHouseholdAssumptions()).toEqual({ set: "historical", overrides: {} });
  });

  it("marks set values as assumptionSet and roughly", () => {
    const r = resolveAssumptions(defaultHouseholdAssumptions());
    expect(r.set).toBe("historical");
    expect(r.returns.stocks).toMatchObject({ value: [4, 6.5, 8.5], source: "assumptionSet", confidence: "roughly" });
    expect(r.inflation.value).toEqual([2, 3, 4]);
    expect(r.planToAge).toMatchObject({ value: 95, source: "assumptionSet" });
    expect(r.phases.value).toHaveLength(3);
  });

  it("applies a single override and keeps its user metadata", () => {
    const r = resolveAssumptions({
      set: "historical",
      overrides: { returns: { stocks: userValue([3, 5, 7] as const, asOf) }, planToAge: userValue(90, asOf) },
    });
    expect(r.returns.stocks).toEqual({ value: [3, 5, 7], asOf, source: "user", confidence: "known" });
    expect(r.returns.bonds.source).toBe("assumptionSet");
    expect(r.planToAge.value).toBe(90);
  });

  it("switches sets without copying numbers into the household", () => {
    const r = resolveAssumptions({ set: "mmm", overrides: {} });
    expect(r.returns.stocks.value).toEqual([3, 5, 7]);
  });
});
