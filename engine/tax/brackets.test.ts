import { describe, expect, it } from "vitest";
import { marginalRateFromBrackets, taxFromBrackets } from "./brackets";

const schedule = [
  { from: 0, rate: 10 },
  { from: 12400, rate: 12 },
  { from: 50400, rate: 22 },
];

describe("taxFromBrackets", () => {
  it("is zero at or below zero income", () => {
    expect(taxFromBrackets(0, schedule)).toBe(0);
    expect(taxFromBrackets(-500, schedule)).toBe(0);
  });

  it("taxes only the first bracket for small incomes", () => {
    expect(taxFromBrackets(10000, schedule)).toBe(1000);
    expect(taxFromBrackets(12400, schedule)).toBe(1240);
  });

  it("stacks brackets marginally", () => {
    // 1,240 + 12% of 38,000 = 5,800 at the top of the 12% bracket (matches Rev. Proc. 2025-32 Table 3)
    expect(taxFromBrackets(50400, schedule)).toBeCloseTo(5800, 6);
    // Maya's 2026 federal taxable income: 5,800 + 22% of 2,620
    expect(taxFromBrackets(53020, schedule)).toBeCloseTo(6376.4, 6);
  });

  it("handles a zero-rate floor bracket", () => {
    const ohio = [{ from: 0, rate: 0 }, { from: 26050, rate: 2.75 }];
    expect(taxFromBrackets(26050, ohio)).toBe(0);
    expect(taxFromBrackets(36050, ohio)).toBeCloseTo(275, 6);
  });
});

describe("marginalRateFromBrackets", () => {
  it("returns the rate of the bracket the income sits in", () => {
    expect(marginalRateFromBrackets(0, schedule)).toBe(10);
    expect(marginalRateFromBrackets(12399, schedule)).toBe(10);
    expect(marginalRateFromBrackets(12400, schedule)).toBe(12);
    expect(marginalRateFromBrackets(53020, schedule)).toBe(22);
  });
});
