import { describe, expect, it } from "vitest";
import { blendedRealReturn, growBalance, growthEarned } from "./accounts";

const returns = { stocks: 6.5, bonds: 2, cash: 0.5 };

describe("blendedRealReturn", () => {
  it("weights class returns by allocation and subtracts fees", () => {
    // 90/10/0 at 0.2% fees: 5.85 + 0.2 - 0.2 = 5.85
    expect(blendedRealReturn({ stocks: 90, bonds: 10, cash: 0 }, returns, 0.2)).toBeCloseTo(5.85, 9);
    expect(blendedRealReturn({ stocks: 0, bonds: 0, cash: 100 }, returns, 0)).toBeCloseTo(0.5, 9);
    expect(blendedRealReturn({ stocks: 60, bonds: 40, cash: 0 }, returns, 0)).toBeCloseTo(4.7, 9);
  });
});

describe("growBalance", () => {
  it("grows the opening balance for the full period and the flow for half", () => {
    const end = growBalance(10000, 1200, 6, 1);
    expect(end).toBeCloseTo(10000 * 1.06 + 1200 * Math.sqrt(1.06), 9);
  });

  it("prorates both in the stub period", () => {
    const end = growBalance(10000, 300, 6, 0.25);
    expect(end).toBeCloseTo(10000 * 1.06 ** 0.25 + 300 * 1.06 ** 0.125, 9);
  });

  it("handles withdrawals as negative flow and zero rates", () => {
    expect(growBalance(10000, -2000, 0, 1)).toBe(8000);
  });

  it("reports growth separately from flows", () => {
    expect(growthEarned(10000, 0, 6, 1)).toBeCloseTo(600, 9);
    expect(growthEarned(10000, 1200, 6, 1)).toBeCloseTo(600 + 1200 * (Math.sqrt(1.06) - 1), 9);
  });
});
