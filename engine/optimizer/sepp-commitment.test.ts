import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { householdFromExample, type ExampleHouseholdFile } from "../model";
import { optimize } from "./search";
import { seppCommitment } from "./sepp-commitment";

const asOf = "2026-10-03";
const mayaHousehold = () => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("the 72(t) commitment (decision A2)", () => {
  it("is null when the plan takes no 72(t) payments", () => {
    const r = optimize(mayaHousehold(), { objective: "biggestEstate", knobs: ["conversionTarget"] });
    expect(r.best.policy.sepp).toBeNull();
    expect(seppCommitment(mayaHousehold(), r)).toBeNull();
  });

  it("states the rule, the ages it binds, and the best plan without the payments with the difference in estate and FI date", () => {
    // With only the 72(t) knob to search, the biggest-estate plan for Maya takes the payments (the M2 dominance check).
    const r = optimize(mayaHousehold(), { objective: "biggestEstate", knobs: ["sepp"] });
    expect(r.best.policy.sepp).not.toBeNull();
    const c = seppCommitment(mayaHousehold(), r)!;
    expect(c).not.toBeNull();
    expect(c.startAge).toBe(r.best.policy.sepp!.startAge);
    // Payments continue until the later of five years and 59 and a half (IRS Notice 2022-6).
    expect(c.endsAtAge).toBe(Math.max(c.startAge + 5, 59.5));
    expect(c.years).toBeCloseTo(c.endsAtAge - c.startAge, 6);
    expect(c.rule.source).toContain("Notice 2022-6");
    expect(c.rule.modificationPenalty).toContain("10%");
    // The comparison plan holds every other knob the same and the 72(t) knob off.
    expect(c.without.best.policy.sepp).toBeNull();
    expect(c.without.knobs).not.toContain("sepp");
    expect(c.without.retirementYear).toBe(r.retirementYear);
    expect(c.deltaEstateWithout).toBeCloseTo(c.estateWith - c.estateWithout, 6);
    // Here the payments buy estate: the plan with them scored higher by this objective.
    expect(c.estateWith).toBeGreaterThanOrEqual(c.estateWithout);
    expect(c.deltaYearsWithout).toBe(0);
  });
});
