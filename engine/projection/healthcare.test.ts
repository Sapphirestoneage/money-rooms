import { describe, expect, it } from "vitest";
import { RuleLedger } from "../model";
import { acaPremiumCredit, applicablePercentage, healthcareLine, irmaa, magiForPctFpl, povertyLine } from "./healthcare";

const ledger = () => new RuleLedger();
const table = [
  { fplFrom: 0, fplTo: 133, initial: 2.1, final: 2.1 }, { fplFrom: 133, fplTo: 150, initial: 3.14, final: 4.19 }, { fplFrom: 150, fplTo: 200, initial: 4.19, final: 6.6 },
  { fplFrom: 200, fplTo: 250, initial: 6.6, final: 8.44 }, { fplFrom: 250, fplTo: 300, initial: 8.44, final: 9.96 }, { fplFrom: 300, fplTo: 400, initial: 9.96, final: 9.96 },
];

describe("poverty line and applicable percentage", () => {
  it("reads the 2026 guideline for one and adds per extra person", () => {
    // 2025 guidelines, which apply to coverage year 2026 (Federal Register 2025-01377).
    expect(povertyLine(1, ledger())).toBe(15650);
    expect(povertyLine(4, ledger())).toBe(32150);
    expect(povertyLine(10, ledger())).toBe(54150 + 2 * 5500);
    expect(povertyLine(1, ledger(), "AK")).toBe(19550);
    expect(povertyLine(3, ledger(), "HI")).toBe(17990 + 2 * 6330);
    expect(povertyLine(1, ledger(), "TX")).toBe(15650);
  });
  it("interpolates inside a band and is flat at 9.96% from 300% to 400%", () => {
    expect(applicablePercentage(100, table)).toBe(2.1);
    expect(applicablePercentage(175, table)).toBeCloseTo(4.19 + 0.5 * (6.6 - 4.19), 9);
    expect(applicablePercentage(350, table)).toBe(9.96);
    expect(applicablePercentage(400, table)).toBe(9.96);
    expect(applicablePercentage(401, table)).toBeNull();
  });
});

describe("the premium tax credit", () => {
  it("at 250% of the poverty line for one, the household pays 8.44% of income and the credit covers the rest", () => {
    const magi = 2.5 * 15650;
    const r = acaPremiumCredit(magi, 1, 9000, ledger());
    expect(r.applicablePercent).toBeCloseTo(8.44, 9);
    expect(r.netPremium).toBeCloseTo(0.0844 * magi, 6);
    expect(r.credit).toBeCloseTo(9000 - 0.0844 * magi, 6);
  });
  it("the cliff: a dollar over 400% loses the whole credit", () => {
    const under = acaPremiumCredit(4 * 15650, 1, 9000, ledger());
    const over = acaPremiumCredit(4 * 15650 + 1, 1, 9000, ledger());
    expect(under.credit).toBeGreaterThan(0);
    expect(over.credit).toBe(0);
    expect(over.aboveCliff).toBe(true);
  });
  it("under 100% is below the range", () => {
    expect(acaPremiumCredit(10000, 1, 9000, ledger()).belowRange).toBe(true);
  });
  it("gives the MAGI for a target percent of the poverty line", () => {
    expect(magiForPctFpl(200, 1, ledger())).toBeCloseTo(31300, 6);
  });
});

describe("IRMAA", () => {
  it("standard premium under the first threshold, tier 1 just above it, top tier far above", () => {
    expect(irmaa(100000, "single", ledger())).toMatchObject({ tier: 0, partBAnnual: 12 * 202.9, partDAdjustmentAnnual: 0 });
    expect(irmaa(109001, "single", ledger())).toMatchObject({ tier: 1, partBAnnual: 12 * 284.1, partDAdjustmentAnnual: 12 * 14.5, nextTierAt: 137000 });
    expect(irmaa(600000, "single", ledger())).toMatchObject({ tier: 5, partBAnnual: 12 * 689.9 });
    expect(irmaa(300000, "marriedJoint", ledger())).toMatchObject({ tier: 2 });
    expect(irmaa(200000, "marriedSeparate", ledger())).toMatchObject({ tier: 1 });
  });
});

describe("the health care line", () => {
  it("before 65 is the marketplace premium after the credit; from 65 it is Medicare plus the placeholders", () => {
    const l = ledger();
    const pre = healthcareLine({ age: 50, magiAca: 30000, magiTwoYearsBack: 30000, householdSize: 1, filingStatus: "single", medicaidExpansion: null, ledger: l });
    expect(pre.total).toBeLessThan(7200);
    expect(pre.aca?.applicablePercent).not.toBeNull();
    const post = healthcareLine({ age: 70, magiAca: 30000, magiTwoYearsBack: 30000, householdSize: 1, filingStatus: "single", medicaidExpansion: null, ledger: l });
    expect(post.total).toBeCloseTo(12 * 202.9 + 480 + 1200, 6);
    expect(l.refs().map((r) => r.id)).toEqual(expect.arrayContaining(["health.acaPtc.2026", "health.fpl.2026", "health.irmaa.2026"]));
  });
  it("flags the cliff and Medicaid", () => {
    const over = healthcareLine({ age: 50, magiAca: 90000, magiTwoYearsBack: 0, householdSize: 1, filingStatus: "single", medicaidExpansion: null, ledger: ledger() });
    expect(over.flags[0]).toMatch(/above 400%/);
    const low = healthcareLine({ age: 50, magiAca: 5000, magiTwoYearsBack: 0, householdSize: 1, filingStatus: "single", medicaidExpansion: true, ledger: ledger() });
    expect(low.total).toBe(0);
  });
});
