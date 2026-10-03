import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { householdFromExample, type ExampleHouseholdFile } from "../model";
import { project } from "./fi";

const asOf = "2026-10-02";

describe("project: the FI date in three bands (Maya)", () => {
  const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
  const result = project(h);

  it("returns a result for every band", () => {
    expect(Object.keys(result.bands).sort()).toEqual(["best", "likely", "worst"]);
    for (const band of Object.values(result.bands)) {
      expect(band.timeline.rows.length).toBeGreaterThan(60);
    }
  });

  it("finds a funded FI date in each band, ordered best before likely before worst", () => {
    const { best, likely, worst } = result.bands;
    expect(best.funded && likely.funded && worst.funded).toBe(true);
    expect(best.fiAge!).toBeLessThanOrEqual(likely.fiAge!);
    expect(likely.fiAge!).toBeLessThanOrEqual(worst.fiAge!);
    expect(likely.fiAge!).toBeGreaterThan(30);
    expect(likely.fiAge!).toBeLessThan(67);
  });

  it("the FI timeline has no shortfall, and retiring a year earlier does", () => {
    const likely = result.bands.likely;
    expect(likely.timeline.firstShortfall).toBeNull();
    expect(likely.oneYearEarlier).not.toBeNull();
    expect(likely.oneYearEarlier!.age).toBeGreaterThan(likely.fiAge!);
  });

  it("reports an estate at plan-to age and lifetime taxes", () => {
    const likely = result.bands.likely;
    expect(likely.timeline.estate).toBeGreaterThanOrEqual(0);
    expect(likely.timeline.lifetimeTaxes).toBeGreaterThan(0);
  });
});

describe("project: never funded", () => {
  it("says so plainly instead of inventing a date", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    if (h.spending.kind !== "rows") throw new Error("rows expected");
    h.spending.rows[0]!.annual = { ...h.spending.rows[0]!.annual, value: 200000 };
    const r = project(h);
    expect(r.bands.likely.funded).toBe(false);
    expect(r.bands.likely.fiAge).toBeNull();
    expect(r.bands.likely.neverFundedShortfall).not.toBeNull();
  });
});
