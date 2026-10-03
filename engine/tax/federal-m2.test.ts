import { describe, expect, it } from "vitest";
import { RuleLedger, loadTaxTables } from "../model";
import { bracketTop, capitalGainsTax, computeFederalTaxM2, seniorDeduction, taxableSocialSecurity, type FederalTaxM2Input } from "./federal-m2";

const t = loadTaxTables(2026).federal;
const base: FederalTaxM2Input = {
  year: 2026, age: 40, filingStatus: "single", wages: 0, pretaxPayrollDeductions: 0, selfEmploymentNet: 0,
  otherOrdinaryIncome: 0, rothConversions: 0, socialSecurity: 0, longTermGains: 0, penalized: 0, iraDeduction: 0,
};
const ss = { single: [25000, 34000] as [number, number], headOfHousehold: [25000, 34000] as [number, number], marriedJoint: [32000, 44000] as [number, number], marriedSeparateLivedTogether: [0, 0] as [number, number], inclusion: [50, 85] as [number, number], maxTaxablePct: 85 };

describe("taxable Social Security (IRC 86)", () => {
  it("is zero under the base amount", () => expect(taxableSocialSecurity(20000, 10000, "single", ss)).toBe(0));
  it("is half the excess between the base and adjusted amounts", () => {
    // provisional = 20,000 + 10,000 = 30,000; 50% of (30,000 - 25,000) = 2,500
    expect(taxableSocialSecurity(20000, 20000, "single", ss)).toBe(2500);
  });
  it("tops out at 85% of the benefit", () => expect(taxableSocialSecurity(20000, 100000, "single", ss)).toBe(17000));
  it("uses the joint thresholds for joint filers", () => expect(taxableSocialSecurity(20000, 20000, "marriedJoint", ss)).toBe(0));
});

describe("senior deduction", () => {
  const r = { perPerson: 6000, phaseOutStartMagi: { single: 75000, marriedJoint: 150000 }, phaseOutRate: 0.06 };
  it("is 6,000 at 65 under the threshold, phases out at 6% above it, and is zero under 65 or when the rule is gone", () => {
    expect(seniorDeduction(65, 50000, "single", r)).toBe(6000);
    expect(seniorDeduction(70, 100000, "single", r)).toBe(4500);
    expect(seniorDeduction(70, 175000, "single", r)).toBe(0);
    expect(seniorDeduction(64, 50000, "single", r)).toBe(0);
    expect(seniorDeduction(70, 50000, "single", null)).toBe(0);
  });
});

describe("capital gains stacking", () => {
  const schedule = [{ from: 0, rate: 0 }, { from: 49450, rate: 15 }, { from: 545500, rate: 20 }];
  it("gains inside the 0% bracket owe nothing", () => expect(capitalGainsTax(10000, 30000, schedule)).toBe(0));
  it("gains that cross the top of the 0% bracket owe 15% on the part above it", () => expect(capitalGainsTax(40000, 20000, schedule)).toBeCloseTo(0.15 * (60000 - 49450), 6));
});

describe("computeFederalTaxM2", () => {
  it("matches the M1 ordinary tax for plain wages and reads the rules it used", () => {
    const ledger = new RuleLedger();
    const r = computeFederalTaxM2({ ...base, wages: 60000 }, t, ledger);
    // 60,000 - 16,100 = 43,900 taxable: 1,240 + 12% of (43,900 - 12,400) = 5,020
    expect(r.ordinaryTax).toBeCloseTo(5020, 6);
    expect(r.socialSecurityTax).toBeCloseTo(3720, 6);
    expect(ledger.refs().map((x) => x.id)).toContain("fed.brackets.2026");
    expect(ledger.refs().map((x) => x.id)).toContain("ss.taxationThresholds");
  });

  it("a retiree living on 0% gains and a conversion inside the standard deduction pays no federal tax", () => {
    const r = computeFederalTaxM2({ ...base, rothConversions: 16000, longTermGains: 30000 }, t, new RuleLedger());
    expect(r.taxableIncome).toBe(29900);
    expect(r.ordinaryTax).toBe(0);
    expect(r.capitalGainsTax).toBe(0);
    expect(r.total).toBe(0);
    expect(r.zeroPercentGainRoom).toBeCloseTo(49450 - 29900, 6);
  });

  it("counts the taxable part of Social Security, the aged extra deduction, and the senior deduction at 70 in 2027", () => {
    const r = computeFederalTaxM2({ ...base, year: 2027, age: 70, socialSecurity: 30000, otherOrdinaryIncome: 40000 }, t, new RuleLedger());
    // provisional 55,000: 4,500 + 85% of 21,000 = 22,350, under the 25,500 cap
    expect(r.taxableSocialSecurity).toBeCloseTo(22350, 6);
    expect(r.standardDeduction).toBe(16100 + 2050);
    expect(r.seniorDeduction).toBe(6000);
    expect(r.magiAca).toBeCloseTo(40000 + 30000, 6);
  });

  it("drops the senior deduction after its sunset", () => {
    const r = computeFederalTaxM2({ ...base, year: 2029, age: 70, otherOrdinaryIncome: 40000 }, t, new RuleLedger());
    expect(r.seniorDeduction).toBe(0);
  });

  it("charges NIIT only on gains above the threshold", () => {
    const r = computeFederalTaxM2({ ...base, wages: 190000, longTermGains: 50000 }, t, new RuleLedger());
    expect(r.niit).toBeCloseTo(0.038 * 40000, 6);
  });

  it("the 10% additional tax applies only to the penalized dollars", () => {
    const r = computeFederalTaxM2({ ...base, otherOrdinaryIncome: 20000, penalized: 20000 }, t, new RuleLedger());
    expect(r.penalty).toBe(2000);
  });

  it("knows the top of each bracket", () => {
    const ledger = new RuleLedger();
    expect(bracketTop(10, "single", ledger)).toBe(12400);
    expect(bracketTop(12, "single", ledger)).toBe(50400);
    expect(bracketTop(22, "marriedJoint", ledger)).toBe(211400);
  });
});
