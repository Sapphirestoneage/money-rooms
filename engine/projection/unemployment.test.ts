/**
 * Unemployment benefits as an income stream (data dictionary 3.4, decision E18),
 * with hand-worked examples. The benefit is paid through its end month, taxed as
 * ordinary income, and carries no payroll tax.
 */

import { describe, expect, it } from "vitest";
import {
  addMonths,
  annualFrom,
  assetFromPreset,
  defaultHouseholdAssumptions,
  emptyHousehold,
  loadSocialSecurityParams,
  loadTaxTables,
  resolveAssumptions,
  userValue,
  weeksThroughEndOf,
  type IncomeStream,
} from "../model";
import { resolveBand } from "./bands";
import { incomeForYear, streamShare } from "./income";
import { requireComplete, runTimeline } from "./timeline";

const asOf = "2026-10-03";
const likely = resolveBand(resolveAssumptions(defaultHouseholdAssumptions()), "likely");
const deps = { tables: loadTaxTables(2026), ssParams: loadSocialSecurityParams(2026) };

// $504 a week, paid through March 2027.
const weekly = 504;
const annual = annualFrom(weekly, "week");
const benefits: IncomeStream = { id: "ui", type: "unemployment", grossAnnual: userValue(annual, asOf), end: { kind: "date", date: "2027-03" } };

const stub = { year: 2026, t: 0, age: 25, retirementYear: 2060, fraction: 0.25, startMonth: 10 };
const next = { year: 2027, t: 1, age: 26, retirementYear: 2060, fraction: 1, startMonth: 1 };
const after = { year: 2028, t: 2, age: 27, retirementYear: 2060, fraction: 1, startMonth: 1 };

describe("entering a weekly benefit", () => {
  it("52 weeks make the stored annual amount", () => {
    expect(annual).toBe(26208);
  });

  it("date helpers: six months out, and weeks left", () => {
    expect(addMonths("2026-10", 5)).toBe("2027-03");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    // October 3, 2026 through March 31, 2027 is 180 days, about 26 weeks.
    expect(weeksThroughEndOf("2026-10-03", "2027-03")).toBe(26);
    expect(weeksThroughEndOf("2026-10-03", "2026-09")).toBe(0);
  });
});

describe("a stream that ends on a date is paid through that month", () => {
  it("counts the whole stub when it outlasts the year", () => {
    expect(streamShare(benefits, stub)).toBe(1);
  });

  it("counts three of twelve months in its last year", () => {
    expect(streamShare(benefits, next)).toBeCloseTo(3 / 12, 12);
    expect(streamShare(benefits, after)).toBe(0);
  });

  it("counts part of the stub when it ends inside it", () => {
    // Paid through November: October and November are 2 of the stub's 3 months.
    const short: IncomeStream = { ...benefits, end: { kind: "date", date: "2026-11" } };
    expect(streamShare(short, stub)).toBeCloseTo(2 / 3, 12);
    expect(streamShare(short, next)).toBe(0);
  });
});

describe("unemployment in the income step", () => {
  it("is taxable income with no payroll tax, and does not grow", () => {
    const y = incomeForYear([benefits], stub, likely);
    expect(y.otherTaxable).toBe(26208);
    expect(y.wages).toBe(0);
    expect(y.selfEmploymentNet).toBe(0);
    const y1 = incomeForYear([benefits], next, likely);
    // Three months of 2027: 26,208 x 3 / 12 = 6,552, with no growth.
    expect(y1.otherTaxable).toBeCloseTo(6552, 6);
  });
});

describe("unemployment through the whole timeline", () => {
  const h = emptyHousehold(asOf);
  h.self.birthDate = userValue("2001-03", asOf);
  h.self.state = userValue("TX", asOf);
  h.self.income = { kind: "rows", rows: [benefits] };
  h.spending = { kind: "rows", rows: [{ id: "total", category: "everythingElse", annual: userValue(24000, asOf, "roughly") }] };
  h.accounts = { kind: "rows", rows: [assetFromPreset("savings", "hysa", userValue(30000, asOf), asOf)] };
  const r = runTimeline(requireComplete(h), { ...deps, band: likely, retirementYear: Infinity });
  const y0 = r.rows[0]!;
  const y1 = r.rows[1]!;
  const y2 = r.rows[2]!;

  it("2026: three months of benefits, federal tax but no FICA", () => {
    // Stub: 26,208 x 0.25 = 6,552 received.
    expect(y0.income.otherTaxable).toBeCloseTo(6552, 6);
    expect(y0.income.wages).toBe(0);
    expect(y0.taxes.fica).toBe(0);
    expect(y0.taxes.selfEmployment).toBe(0);
    // Tax is figured on the annualized amount, then prorated (convention C2):
    // 26,208 - 16,100 = 10,108 taxable, 10% = 1,010.80 a year, a quarter of it is 252.70.
    expect(y0.taxes.federalIncome).toBeCloseTo(252.7, 2);
    expect(y0.taxes.state).toBe(0);
    expect(y0.takeHome).toBeCloseTo(6552 - 252.7, 2);
  });

  it("2027: benefits stop after March, and the year's income is under the standard deduction", () => {
    expect(y1.income.otherTaxable).toBeCloseTo(6552, 6);
    expect(y1.taxes.federalIncome).toBe(0);
    expect(y1.takeHome).toBeCloseTo(6552, 6);
  });

  it("2028: no benefits, and savings above the reserve cover the gap first", () => {
    expect(y2.income.gross).toBe(0);
    expect(y1.gap).toBeLessThan(0);
    expect(Object.keys(y1.withdrawals)).toEqual(["hysa"]);
  });

  it("does not count benefits toward the Social Security earnings record", () => {
    expect(r.socialSecurity.pia).toBe(0);
  });
});
