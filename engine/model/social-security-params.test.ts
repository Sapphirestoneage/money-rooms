import { describe, expect, it } from "vitest";
import { loadSocialSecurityParams } from "./social-security-params";

describe("Social Security parameters for 2026 (SSA Office of the Chief Actuary)", () => {
  const p = loadSocialSecurityParams(2026);

  it("has the 2026 bend points and the 90/32/15 formula", () => {
    expect(p.pia.bendPointsMonthly).toEqual([1286, 7749]);
    expect(p.pia.rates).toEqual([90, 32, 15]);
    expect(p.pia.averagingYears).toBe(35);
    expect(p.pia.eligibilityAge).toBe(62);
  });

  it("gives full retirement age by birth year", () => {
    expect(p.normalRetirementAge(1937)).toEqual({ years: 65, months: 0 });
    expect(p.normalRetirementAge(1940)).toEqual({ years: 65, months: 6 });
    expect(p.normalRetirementAge(1950)).toEqual({ years: 66, months: 0 });
    expect(p.normalRetirementAge(1957)).toEqual({ years: 66, months: 6 });
    expect(p.normalRetirementAge(1960)).toEqual({ years: 67, months: 0 });
    expect(p.normalRetirementAge(2001)).toEqual({ years: 67, months: 0 });
  });

  it("has the early reduction rule that produces 30% at 62 with a 67 full retirement age", () => {
    const { firstMonths, ratePerMonthFirst, ratePerMonthBeyond } = p.earlyReduction;
    const reduction = firstMonths * ratePerMonthFirst + (60 - firstMonths) * ratePerMonthBeyond;
    expect(reduction).toBeCloseTo(30, 6);
    expect(p.earliestClaimingAge).toBe(62);
    expect(p.latestCreditedAge).toBe(70);
  });

  it("gives 8% a year of delayed credit for anyone born 1943 or later", () => {
    expect(p.delayedCreditPercentPerYear(1943)).toBe(8);
    expect(p.delayedCreditPercentPerYear(2001)).toBe(8);
    expect(p.delayedCreditPercentPerYear(1924)).toBe(3);
    expect(p.delayedCreditPercentPerYear(1935)).toBe(6);
  });

  it("refuses a year that has no file", () => {
    expect(() => loadSocialSecurityParams(2027)).toThrow(/No Social Security parameters for 2027/);
  });
});
