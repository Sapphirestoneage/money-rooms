import { describe, expect, it } from "vitest";
import { RuleLedger } from "../model";
import { drawRoth, governmental457bPenaltyFree, lifeExpectancy, requiredMinimumDistribution, rmdStartAge, ruleOf55Applies, seppMaxRate, seppPayment, seppYearsRequired } from "./drawdown";

const ledger = () => new RuleLedger();

describe("life expectancy tables", () => {
  it("reads the Uniform Lifetime and Single Life tables and clamps the ends", () => {
    expect(lifeExpectancy(73)).toBe(26.5);
    expect(lifeExpectancy(75)).toBe(24.6);
    expect(lifeExpectancy(50, "singleLife")).toBe(36.2);
    expect(lifeExpectancy(130)).toBe(2.0);
    expect(lifeExpectancy(5)).toBe(88.2);
  });
});

describe("required minimum distributions", () => {
  it("start at 73 for someone born in 1958 and 75 for someone born in 1965", () => {
    expect(rmdStartAge(1958, ledger())).toBe(73);
    expect(rmdStartAge(1965, ledger())).toBe(75);
    expect(rmdStartAge(1950, ledger())).toBe(72);
  });
  it("is the prior balance over the divisor from the start age, and nothing before", () => {
    expect(requiredMinimumDistribution(265000, 73, 1958, ledger())).toBeCloseTo(10000, 6);
    expect(requiredMinimumDistribution(265000, 72, 1958, ledger())).toBe(0);
    expect(requiredMinimumDistribution(246000, 75, 1965, ledger())).toBeCloseTo(10000, 6);
  });
});

describe("Roth ordering", () => {
  const layers = { basis: 10000, conversions: [{ year: 2030, amount: 5000 }, { year: 2033, amount: 5000 }], firstYear: 2020 };
  it("takes contributions first, free", () => {
    const d = drawRoth(8000, 40000, layers, 2035, 45, 59.5, ledger());
    expect(d.free).toBe(8000);
    expect(d.penalizedConversions).toBe(0);
    expect(d.earnings).toBe(0);
    expect(d.after.basis).toBe(2000);
  });
  it("then conversions oldest first: a seasoned one is free, a young one under 59 and a half is penalized", () => {
    const d = drawRoth(18000, 40000, layers, 2035, 45, 59.5, ledger());
    // 10,000 basis + 5,000 from 2030 (clock done in 2035) free; 3,000 from 2033 (clock runs to 2038) penalized
    expect(d.free).toBe(15000);
    expect(d.penalizedConversions).toBe(3000);
    expect(d.earnings).toBe(0);
    expect(d.after.conversions).toEqual([{ year: 2033, amount: 2000 }]);
  });
  it("then earnings, which are ordinary income and penalized before 59 and a half", () => {
    const d = drawRoth(25000, 40000, layers, 2035, 45, 59.5, ledger());
    expect(d.earnings).toBe(5000);
    expect(d.earningsPenalized).toBe(true);
  });
  it("after 59 and a half with the five-year clock met, everything is free", () => {
    const d = drawRoth(25000, 40000, layers, 2040, 62, 59.5, ledger());
    expect(d.free).toBe(20000);
    expect(d.penalizedConversions).toBe(0);
    expect(d.earnings).toBe(5000);
    expect(d.earningsPenalized).toBe(false);
  });
  it("never draws more than the balance", () => {
    expect(drawRoth(99999, 12000, layers, 2035, 45, 59.5, ledger()).free + 0).toBe(12000);
  });
});

describe("72(t) payments", () => {
  it("the rate ceiling is the greater of 5% and 120% of the mid-term rate", () => {
    expect(seppMaxRate(3, ledger())).toBe(5);
    expect(seppMaxRate(5, ledger())).toBeCloseTo(6, 9);
  });
  it("the RMD method is balance over the divisor; amortization is the level payment at the rate; annuitization is close to it", () => {
    const l = ledger();
    expect(seppPayment({ balance: 500000, age: 50, method: "rmd", interestRatePercent: 5 }, l)).toBeCloseTo(500000 / 48.5, 6);
    const amort = seppPayment({ balance: 500000, age: 50, method: "fixedAmortization", interestRatePercent: 5 }, l);
    expect(amort).toBeCloseTo((500000 * 0.05) / (1 - Math.pow(1.05, -48.5)), 6);
    const annu = seppPayment({ balance: 500000, age: 50, method: "fixedAnnuitization", interestRatePercent: 5 }, l);
    expect(annu).toBeGreaterThan(amort);
    expect(annu).toBeLessThan(amort * 1.25);
    expect(l.refs().map((r) => r.id)).toContain("access.sepp72t");
  });
  it("payments run the longer of five years or to 59 and a half", () => {
    expect(seppYearsRequired(50, 59.5)).toBe(10);
    expect(seppYearsRequired(57, 59.5)).toBe(5);
  });
});

describe("rule of 55 and 457(b)", () => {
  it("applies to someone who left at 55 or later, from the separation year on", () => {
    expect(ruleOf55Applies(55, 56, 2041, 2040, ledger())).toBe(true);
    expect(ruleOf55Applies(54, 56, 2042, 2040, ledger())).toBe(false);
    expect(ruleOf55Applies(50, 51, 2041, 2040, ledger(), true)).toBe(true);
  });
  it("governmental 457(b) is penalty free after separation", () => {
    expect(governmental457bPenaltyFree(2040, 2039, ledger())).toBe(true);
    expect(governmental457bPenaltyFree(2038, 2039, ledger())).toBe(false);
  });
});
