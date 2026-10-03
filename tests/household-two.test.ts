/**
 * Households of two (docs/household-two-spec.md, acceptance tests 1 to 8).
 * Every case runs under m2 conventions unless it says otherwise. A household of one
 * is covered by every other test file and by the Maya tie-out.
 */

import { describe, expect, it } from "vitest";
import {
  assetFromPreset,
  computeFederalTax,
  defaultDeps,
  emptyHousehold,
  emptyPerson,
  payrollTaxesForPerson,
  requireComplete,
  resolveAssumptions,
  resolveBand,
  runTimeline,
  userValue,
  type Account,
  type EngineConventions,
  type FilingStatus,
  type Household,
  type IncomeStream,
  type SpendingRow,
} from "../engine";

const asOf = "2026-10-03";
const deps = defaultDeps();
const fed = deps.tables.federal;
const likelyBand = (h: Household) => resolveBand(resolveAssumptions(h.assumptions), "likely");
const run = (h: Household, retirementYear: number, conventions: EngineConventions = "m2") =>
  runTimeline(requireComplete(h), { band: likelyBand(h), retirementYear, tables: deps.tables, ssParams: deps.ssParams, conventions });

function salary(id: string, gross: number, extra: Partial<IncomeStream> = {}): IncomeStream {
  return { id, type: "salary", grossAnnual: userValue(gross, asOf), end: { kind: "retirement" }, ...extra };
}
function spend(annual: number): SpendingRow {
  return { id: "s", category: "everythingElse", annual: userValue(annual, asOf, "roughly") };
}
function household(o: { birth: string; income: IncomeStream[]; spending: number; accounts: Account[]; filing?: FilingStatus; partner?: { birth: string; income: IncomeStream[] } }): Household {
  const h = emptyHousehold(asOf);
  h.self.birthDate = userValue(o.birth, asOf);
  h.self.state = userValue("TX", asOf);
  h.self.filingStatus = userValue(o.filing ?? (o.partner ? "marriedJoint" : "single"), asOf);
  h.self.income = o.income.length ? { kind: "rows", rows: o.income } : { kind: "none", asOf };
  h.spending = { kind: "rows", rows: [spend(o.spending)] };
  h.accounts = { kind: "rows", rows: o.accounts };
  if (o.partner) {
    h.partner = emptyPerson(asOf);
    h.partner.birthDate = userValue(o.partner.birth, asOf);
    h.partner.income = o.partner.income.length ? { kind: "rows", rows: o.partner.income } : { kind: "none", asOf };
  }
  return h;
}
const brokerage = (balance: number, owner?: "self" | "partner" | "joint"): Account => {
  const a = assetFromPreset("brokerage", `brk-${owner ?? "self"}`, userValue(balance, asOf), asOf);
  if (owner) a.owner = owner;
  return a;
};
const pretax = (balance: number, owner: "self" | "partner"): Account => {
  const a = assetFromPreset("trad401k", `k401-${owner}`, userValue(balance, asOf), asOf);
  a.owner = owner;
  return a;
};
const yearRow = (rows: ReturnType<typeof run>["rows"], year: number) => rows.find((r) => r.year === year)!;

describe("households of two: taxes (acceptance tests 2 and 3)", () => {
  const two = (filing: FilingStatus) =>
    household({ birth: "1986-04", income: [salary("a", 150_000)], spending: 60_000, accounts: [brokerage(100_000)], filing, partner: { birth: "1988-09", income: [salary("b", 40_000)] } });

  it("files one joint return on both incomes, or two separate returns, and the two differ as the brackets imply", () => {
    const joint = yearRow(run(two("marriedJoint"), 2060).rows, 2027);
    const separate = yearRow(run(two("marriedSeparate"), 2060).rows, 2027);
    // Wages in 2027 carry one year of real growth, so read them from the row: the partner's side is reported, the self's is the rest.
    const partnerWages = joint.partner!.income;
    const selfWages = joint.income.wages - partnerWages;
    expect(partnerWages).toBeGreaterThan(40_000 - 1);
    expect(selfWages).toBeGreaterThan(150_000 - 1);
    // The joint return on the combined income.
    const jointDirect = computeFederalTax({ filingStatus: "marriedJoint", wages: selfWages, pretaxPayrollDeductions: 0, selfEmploymentNet: 0, otherOrdinaryIncome: 0, earlyWithdrawals: 0, partnerWages }, fed);
    // Two separate returns, each on the person's own wages.
    const sepA = computeFederalTax({ filingStatus: "marriedSeparate", wages: selfWages, pretaxPayrollDeductions: 0, selfEmploymentNet: 0, otherOrdinaryIncome: 0, earlyWithdrawals: 0 }, fed);
    const sepB = computeFederalTax({ filingStatus: "marriedSeparate", wages: partnerWages, pretaxPayrollDeductions: 0, selfEmploymentNet: 0, otherOrdinaryIncome: 0, earlyWithdrawals: 0 }, fed);
    // The m2 engine taxes the same wages the same way in a year with no gains, benefits, or conversions.
    expect(joint.taxes.federalIncome).toBeCloseTo(jointDirect.incomeTax, 0);
    expect(separate.taxes.federalIncome).toBeCloseTo(sepA.incomeTax + sepB.incomeTax, 0);
    // Unequal incomes: filing jointly costs less than filing separately.
    expect(joint.taxes.federalIncome).toBeLessThan(separate.taxes.federalIncome);
  });

  it("caps Social Security tax per person: two earners above the wage base pay two caps", () => {
    const h = household({ birth: "1986-04", income: [salary("a", 250_000)], spending: 80_000, accounts: [brokerage(100_000)], partner: { birth: "1988-09", income: [salary("b", 250_000)] } });
    const row = yearRow(run(h, 2060).rows, 2027);
    const each = row.income.wages / 2;
    const one = payrollTaxesForPerson(each, 0, fed);
    const cap = (fed.fica.socialSecurityWageBase * fed.fica.socialSecurityRate) / 100;
    expect(one.socialSecurityTax).toBeCloseTo(cap, 2);
    // Both employee FICA pieces plus the additional Medicare tax on the joint threshold.
    const additional = (Math.max(0, row.income.wages - fed.fica.additionalMedicareThreshold.marriedJoint) * fed.fica.additionalMedicareRate) / 100;
    expect(row.taxes.fica).toBeCloseTo(2 * one.socialSecurityTax + 2 * one.medicareTax + additional, 0);
    // One person earning the same total pays one cap. The difference is the second cap, less the additional
    // Medicare tax a single filer owes on the stretch between the single and joint thresholds.
    const single = household({ birth: "1986-04", income: [salary("a", 500_000)], spending: 80_000, accounts: [brokerage(100_000)] });
    const singleRow = yearRow(run(single, 2060).rows, 2027);
    expect(singleRow.income.wages).toBeCloseTo(row.income.wages, 0);
    const thresholdGap = ((fed.fica.additionalMedicareThreshold.marriedJoint - fed.fica.additionalMedicareThreshold.single) * fed.fica.additionalMedicareRate) / 100;
    expect(row.taxes.fica - singleRow.taxes.fica).toBeCloseTo(cap - thresholdGap, 0);
  });
});

describe("households of two: ages per person (acceptance tests 4 and 5)", () => {
  it("applies the partner's 401(k) catch-up at the partner's age 50, not the self's", () => {
    const contribution = { id: "d", type: "401k" as const, percentOfPay: userValue(30, asOf), accountType: userValue("traditional" as const, asOf) };
    const base = fed.contributionLimits.workplaceElective;
    const catchUp = fed.contributionLimits.workplaceCatchUp50;
    const young = household({ birth: "1990-01", income: [salary("a", 50_000)], spending: 50_000, accounts: [brokerage(50_000)], partner: { birth: "1986-06", income: [salary("b", 100_000, { preTaxDeductions: [contribution] })] } });
    const fifty = household({ birth: "1990-01", income: [salary("a", 50_000)], spending: 50_000, accounts: [brokerage(50_000)], partner: { birth: "1976-06", income: [salary("b", 100_000, { preTaxDeductions: [contribution] })] } });
    // 30% of about 100,000 is about 30,000: above the base limit, below the limit with the 50+ catch-up.
    const youngRow = yearRow(run(young, 2070).rows, 2027);
    const result = run(fifty, 2070);
    const fiftyRow = yearRow(result.rows, 2027);
    const elected = 0.3 * fiftyRow.partner!.income;
    expect(elected).toBeGreaterThan(base);
    expect(elected).toBeLessThanOrEqual(base + catchUp);
    expect(youngRow.deductions.workplacePretax).toBeCloseTo(base, 0);
    expect(fiftyRow.deductions.workplacePretax).toBeCloseTo(elected, 0);
    // The contribution lands in a partner-owned account.
    expect(result.accounts.find((a) => a.id === "engine:trad401k:partner")).toBeDefined();
    expect(fiftyRow.contributions["engine:trad401k:partner"]).toBeCloseTo(elected, 0);
  });

  it("penalizes a partner-owned pretax draw by the partner's age, and taxes a joint brokerage on the household return", () => {
    // Self is 62 (penalty free), partner is 50. Retired now, living on one pretax account.
    const partnerOwned = household({ birth: "1964-03", income: [], spending: 50_000, accounts: [pretax(800_000, "partner")], partner: { birth: "1976-03", income: [] } });
    const selfOwned = household({ birth: "1964-03", income: [], spending: 50_000, accounts: [pretax(800_000, "self")], partner: { birth: "1976-03", income: [] } });
    const p = yearRow(run(partnerOwned, 2026).rows, 2027);
    const s = yearRow(run(selfOwned, 2026).rows, 2027);
    expect(p.m2!.penalized).toBeGreaterThan(0);
    expect(p.taxes.penalty).toBeGreaterThan(0);
    expect(s.m2!.penalized).toBe(0);
    expect(s.taxes.penalty).toBe(0);
    // A joint brokerage: gains realized to pay for the year are taxed on the one return, and the draw is never penalized.
    const joint = household({ birth: "1964-03", income: [], spending: 50_000, accounts: [brokerage(800_000, "joint")], partner: { birth: "1976-03", income: [] } });
    const j = yearRow(run(joint, 2026).rows, 2027);
    expect(j.m2!.gainsRealized).toBeGreaterThan(0);
    expect(j.m2!.penalized).toBe(0);
    expect(j.taxes.penalty).toBe(0);
  });
});

describe("households of two: Social Security and the horizon (acceptance tests 6 and 7)", () => {
  // Self born 1960, high earner; partner born 1970 with no record. Both claim at 67. Plan-to age 95.
  const h = household({ birth: "1960-06", income: [salary("a", 150_000)], spending: 60_000, accounts: [brokerage(2_000_000)], partner: { birth: "1970-06", income: [] } });
  const result = run(h, 2027);
  const policy = likelyBand(h).socialSecurityPolicy;

  it("gives a partner with no record up to half the self's PIA once both have claimed", () => {
    expect(result.partnerSocialSecurity!.pia).toBe(0);
    const selfPia = result.socialSecurity.pia;
    expect(selfPia).toBeGreaterThan(0);
    // 2027: self is 67 and has claimed, partner is 57 and has not. No spousal benefit yet.
    expect(yearRow(result.rows, 2030).partner!.socialSecurity).toBe(0);
    // 2037: partner is 67, both have claimed. The spousal benefit is half the self's PIA at full retirement age.
    const both = yearRow(result.rows, 2038);
    expect(both.partner!.socialSecurity).toBeCloseTo(0.5 * selfPia * 12 * policy, 0);
    expect(both.socialSecurity).toBeCloseTo(result.socialSecurity.annualBenefit + 0.5 * selfPia * 12 * policy, 0);
    expect(result.flags.some((f) => f.includes("ss.spousalAndSurvivor"))).toBe(true);
    const ref = result.rulesUsed.find((r) => r.id === "ss.spousalAndSurvivor");
    expect(ref).toBeDefined();
    expect(ref!.lastVerified).toBeNull();
  });

  it("gives the survivor the larger benefit after the first plan-to age", () => {
    // Self reaches 95 in 2055. From 2056 the partner receives the self's full benefit instead of half.
    const before = yearRow(result.rows, 2055);
    const after = yearRow(result.rows, 2056);
    expect(before.partner!.socialSecurity).toBeCloseTo(0.5 * result.socialSecurity.pia * 12 * policy, 0);
    expect(after.partner!.socialSecurity).toBeCloseTo(result.socialSecurity.annualBenefit, 0);
    expect(after.socialSecurity).toBeCloseTo(result.socialSecurity.annualBenefit, 0);
    expect(after.partner!.alive).toBe(true);
  });

  it("runs the horizon to the younger person's plan-to age", () => {
    const last = result.rows[result.rows.length - 1]!;
    expect(last.year).toBe(1970 + 95);
    expect(last.partner!.age).toBe(95);
    // Alone, the self's plan would end at their own 95.
    const alone = household({ birth: "1960-06", income: [salary("a", 150_000)], spending: 60_000, accounts: [brokerage(2_000_000)] });
    expect(run(alone, 2027).rows[run(alone, 2027).rows.length - 1]!.year).toBe(1960 + 95);
  });
});

describe("households of two: one person is unchanged (acceptance tests 1 and 8)", () => {
  it("returns the one-person result when the partner is removed, under both conventions", () => {
    const base = household({ birth: "1986-04", income: [salary("a", 90_000)], spending: 45_000, accounts: [brokerage(120_000)] });
    const withPartner = household({ birth: "1986-04", income: [salary("a", 90_000)], spending: 45_000, accounts: [brokerage(120_000)], partner: { birth: "1988-09", income: [salary("b", 40_000)] } });
    withPartner.self.filingStatus = userValue("single", asOf);
    delete withPartner.partner;
    for (const conventions of ["m1", "m2"] as const) {
      const a = run(base, 2050, conventions);
      const b = run(withPartner, 2050, conventions);
      expect(b.rows).toEqual(a.rows);
      expect(b.estate).toBe(a.estate);
      expect(b.partnerSocialSecurity).toBeUndefined();
      expect(b.rows[0]!.partner).toBeUndefined();
    }
  });

  it("names the partner's birth date when it is missing", () => {
    const h = household({ birth: "1986-04", income: [salary("a", 90_000)], spending: 45_000, accounts: [brokerage(120_000)] });
    h.partner = emptyPerson(asOf);
    expect(() => requireComplete(h)).toThrow(/partner's birth date/);
  });
});
