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
  it("grows the opening balance at the full rate and the flow at half the rate", () => {
    // 10,000 x 1.06 = 10,600; 1,200 x (1 + 0.06 / 2) = 1,236; total 11,836
    expect(growBalance(10000, 1200, 6, 1)).toBeCloseTo(11836, 9);
  });

  it("prorates both in the stub period", () => {
    // The stub period's rate is 1.06^0.25 - 1; the flow earns half of it.
    const period = 1.06 ** 0.25 - 1;
    const end = growBalance(10000, 300, 6, 0.25);
    expect(end).toBeCloseTo(10000 * (1 + period) + 300 * (1 + period / 2), 9);
  });

  it("handles withdrawals as negative flow and zero rates", () => {
    expect(growBalance(10000, -2000, 0, 1)).toBe(8000);
  });

  it("reports growth separately from flows", () => {
    expect(growthEarned(10000, 0, 6, 1)).toBeCloseTo(600, 9);
    // 600 on the opening balance plus 1,200 x 3% = 36 on the flow
    expect(growthEarned(10000, 1200, 6, 1)).toBeCloseTo(636, 9);
  });
});
