import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import {
  defaultHouseholdAssumptions,
  householdFromExample,
  loadSocialSecurityParams,
  loadTaxTables,
  resolveAssumptions,
  userValue,
  type ExampleHouseholdFile,
} from "../model";
import { resolveBand } from "./bands";
import { requireComplete, runTimeline } from "./timeline";

const asOf = "2026-10-02";
const deps = { tables: loadTaxTables(2026), ssParams: loadSocialSecurityParams(2026) };
const likely = resolveBand(resolveAssumptions(defaultHouseholdAssumptions()), "likely");

const mayaHousehold = () => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("requireComplete", () => {
  it("names what is missing", () => {
    const h = mayaHousehold();
    delete h.self.birthDate;
    h.spending = { kind: "unanswered" };
    expect(() => requireComplete(h)).toThrow(/birth date, spending/);
  });
});

describe("runTimeline, Maya, never retiring (entered only)", () => {
  const hh = requireComplete(mayaHousehold());
  const r = runTimeline(hh, { ...deps, band: likely, retirementYear: Infinity });
  const y0 = r.rows[0]!;
  const y1 = r.rows[1]!;

  it("runs from 2026 through the year she turns 95", () => {
    expect(r.rows).toHaveLength(2096 - 2026 + 1);
    expect(y0.year).toBe(2026);
    expect(y0.age).toBe(25);
    expect(r.rows[r.rows.length - 1]).toMatchObject({ year: 2096, age: 95 });
  });

  it("year 0 is a quarter-year stub (E8); year 1 is a full year with real growth", () => {
    expect(y0.fraction).toBeCloseTo(0.25, 9);
    expect(y0.income.wages).toBeCloseTo(72000 * 0.25, 6);
    expect(y1.fraction).toBe(1);
    expect(y1.income.wages).toBeCloseTo(72000 * 1.015, 6);
  });

  it("ties out year 0 take-home: gross less 401(k), federal, FICA, and New York tax", () => {
    // 72,000 - 2,880 - 6,376.40 - 5,508 - 3,135.48 = 54,100.12, times the stub fraction
    expect(y0.takeHome).toBeCloseTo(54100.12 * 0.25, 2);
    expect(y0.taxes.federalIncome).toBeCloseTo(6376.4 * 0.25, 2);
    expect(y0.taxes.fica).toBeCloseTo(5508 * 0.25, 2);
    expect(y0.taxes.state).toBeCloseTo(3135.48 * 0.25, 2);
  });

  it("captures the full match: her 4% already earns the 100% match on 4%", () => {
    expect(y0.employerMatch).toBeCloseTo(2880 * 0.25, 6);
    expect(y0.contributions["k401"]).toBeCloseTo((2880 + 2880) * 0.25, 6);
  });

  it("sends the surplus to a Roth IRA up to the limit, then taxable (entered only)", () => {
    // gap = 54,100.12 - 37,200 spending - 3,120 loan payment = 13,780.12
    expect(y0.gap).toBeCloseTo(13780.12 * 0.25, 2);
    expect(y0.contributions["engine:rothIRA"]).toBeCloseTo(7500 * 0.25, 6);
    expect(y0.contributions["engine:brokerage"]).toBeCloseTo((13780.12 - 7500) * 0.25, 2);
    expect(y0.shortfall).toBe(0);
    expect(r.accounts.find((a) => a.id === "engine:rothIRA")?.implicit).toBe(true);
  });

  it("pays the student loan down and stops the payment once it is gone", () => {
    const paidOffYear = r.rows.find((row) => row.balances["loan"] === 0)!;
    expect(paidOffYear.year).toBeGreaterThan(2030);
    expect(paidOffYear.year).toBeLessThan(2040);
    const after = r.rows[r.rows.indexOf(paidOffYear) + 1]!;
    expect(after.debt.scheduled).toBe(0);
    expect(after.gap).toBeGreaterThan(paidOffYear.gap);
  });

  it("never has a shortfall while working, and nets worth grows", () => {
    expect(r.firstShortfall).toBeNull();
    expect(r.rows[10]!.netWorth).toBeGreaterThan(y0.netWorth);
  });

  it("estimates Social Security from her income and starts it at 67", () => {
    expect(r.socialSecurity.claimingAgeYears).toBe(67);
    expect(r.socialSecurity.factor).toBe(1);
    expect(r.socialSecurity.pia).toBeGreaterThan(2000);
    const at66 = r.rows.find((row) => row.age === 66)!;
    const at67 = r.rows.find((row) => row.age === 67)!;
    expect(at66.socialSecurity).toBe(0);
    expect(at67.socialSecurity).toBeCloseTo(r.socialSecurity.annualBenefit, 6);
  });
});

describe("runTimeline, Maya, retiring at 42", () => {
  const hh = requireComplete(mayaHousehold());
  const r = runTimeline(hh, { ...deps, band: likely, retirementYear: 2043 });

  it("stops work income in the retirement year and records assets at retirement", () => {
    const last = r.rows.find((row) => row.year === 2042)!;
    const first = r.rows.find((row) => row.year === 2043)!;
    expect(last.retired).toBe(false);
    expect(first.retired).toBe(true);
    expect(first.income.gross).toBe(0);
    expect(r.assetsAtRetirement).toBeCloseTo(last.assets, 6);
  });

  it("withdraws in order: cash, then taxable, then pretax with the penalty before 59 and a half", () => {
    const first = r.rows.find((row) => row.year === 2043)!;
    const ids = Object.keys(first.withdrawals);
    expect(ids.length).toBeGreaterThan(0);
    expect(["chk", "hysa"]).toContain(ids[0]);
    const penalized = r.rows.find((row) => row.retired && row.age < 59.5 && (row.withdrawals["k401"] ?? 0) > 0);
    if (penalized) expect(penalized.taxes.penalty).toBeGreaterThan(0);
    const after60 = r.rows.find((row) => row.age === 60 && (row.withdrawals["k401"] ?? 0) > 0);
    if (after60) expect(after60.taxes.penalty).toBe(0);
  });

  it("applies the life phases to discretionary spending in retirement", () => {
    const at70 = r.rows.find((row) => row.age === 70)!;
    const at80 = r.rows.find((row) => row.age === 80)!;
    expect(at70.phaseId).toBe("goGo");
    expect(at80.phaseId).toBe("slowGo");
    expect(at80.spending).toBeCloseTo(at70.spending - 9600 * 0.15, 6);
  });
});

describe("runTimeline, strategies", () => {
  it("max tax savings now fills the traditional 401(k) and the tax saved comes back as more contribution", () => {
    const h = mayaHousehold();
    h.savingsStrategy = userValue("maxTaxSavingsNow", asOf);
    const r = runTimeline(requireComplete(h), { ...deps, band: likely, retirementYear: Infinity });
    const y0 = r.rows[0]!;
    const extra = y0.deductions.workplacePretax / 0.25 - 2880;
    // More than the pre-tax surplus alone (13,780), because the tax saved is looped back in (E10).
    expect(extra).toBeGreaterThan(13780);
    expect(extra).toBeLessThan(24500 - 2880);
    expect(y0.taxes.federalIncome).toBeLessThan(6376.4 * 0.25);
    expect(y0.contributions["engine:brokerage"] ?? 0).toBeCloseTo(0, 2);
  });

  it("max tax-free growth fills the Roth IRA, then a Roth 401(k)", () => {
    const h = mayaHousehold();
    h.savingsStrategy = userValue("maxTaxFreeGrowth", asOf);
    const r = runTimeline(requireComplete(h), { ...deps, band: likely, retirementYear: Infinity });
    const y0 = r.rows[0]!;
    expect(y0.contributions["engine:rothIRA"]).toBeCloseTo(7500 * 0.25, 6);
    expect(y0.contributions["engine:roth401k"]).toBeCloseTo((13780.12 - 7500) * 0.25, 2);
    expect(y0.taxes.federalIncome).toBeCloseTo(6376.4 * 0.25, 2);
  });
});
