import { describe, expect, it } from "vitest";
import { ASSUMPTION_CASES, acrossCases, activeCase, defaultAssumptions, toNominal, withCase } from "../core";
import raw from "../data/assumptions.json";

describe("the assumptions drawer (DATA_MODEL.md section 4)", () => {
  it("has three cases with the same fields, read from app/data/assumptions.json", () => {
    const d = defaultAssumptions();
    expect(ASSUMPTION_CASES).toEqual(["realistic", "likely", "unrealistic"]);
    const keys = (c: object) => Object.keys(c).sort();
    expect(keys(d.cases.realistic)).toEqual(keys(d.cases.likely));
    expect(keys(d.cases.likely)).toEqual(keys(d.cases.unrealistic));
    expect(d.cases).toEqual(raw.cases);
    expect(d.active).toBe(raw.active);
  });

  it("defaults to real dollars and the likely case", () => {
    const d = defaultAssumptions();
    expect(d.dollars).toBe("real");
    expect(d.active).toBe("likely");
    expect(activeCase(d)).toBe(d.cases.likely);
  });

  it("orders the cases: unrealistic is rosier than likely, likely rosier than realistic", () => {
    const d = defaultAssumptions();
    expect(d.cases.unrealistic.returnRealPercent.stocks).toBeGreaterThan(d.cases.likely.returnRealPercent.stocks);
    expect(d.cases.likely.returnRealPercent.stocks).toBeGreaterThan(d.cases.realistic.returnRealPercent.stocks);
    expect(d.cases.realistic.planToAge).toBeGreaterThanOrEqual(d.cases.likely.planToAge);
  });

  it("switches the active case without touching the cases, and refuses an unknown case", () => {
    const d = defaultAssumptions();
    const r = withCase(d, "realistic");
    expect(r.active).toBe("realistic");
    expect(d.active).toBe("likely");
    expect(r.cases).toBe(d.cases);
    expect(() => withCase(d, "hopeful" as never)).toThrow(/No assumption case named hopeful/);
  });

  it("is a fresh copy each time, so one client's edits never leak into another's", () => {
    const a = defaultAssumptions();
    a.cases.likely.inflationPercent = 99;
    expect(defaultAssumptions().cases.likely.inflationPercent).toBe(raw.cases.likely.inflationPercent);
  });

  it("converts real to nominal only on request, from the active case's inflation", () => {
    const d = defaultAssumptions();
    const i = activeCase(d).inflationPercent / 100;
    expect(toNominal(1000, d, 0)).toBe(1000);
    expect(toNominal(1000, d, 10)).toBeCloseTo(1000 * Math.pow(1 + i, 10), 6);
  });

  it("lays one field across the three cases for a three-column view", () => {
    const d = defaultAssumptions();
    expect(acrossCases(d, "inflationPercent")).toEqual({ realistic: d.cases.realistic.inflationPercent, likely: d.cases.likely.inflationPercent, unrealistic: d.cases.unrealistic.inflationPercent });
  });
});
