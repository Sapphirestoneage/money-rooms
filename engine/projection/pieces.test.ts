/**
 * Unit tests, each with a hand-worked example, for the pieces Maya's tie-out
 * does not exercise (decision E12): self-employment tax, HSA contributions and
 * limits, a no-income-tax state, high-interest debt in the waterfall, and an
 * income stream that ends at a set age.
 */

import { describe, expect, it } from "vitest";
import dev from "../../tests/households/dev.json";
import jordan from "../../tests/households/jordan.json";
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
const run = (h: ReturnType<typeof householdFromExample>, retirementYear = Infinity) =>
  runTimeline(requireComplete(h), { ...deps, band: likely, retirementYear });

describe("Dev: self-employment tax, including the deductible half", () => {
  const r = run(householdFromExample(dev as ExampleHouseholdFile, asOf));
  const y0 = r.rows[0]!;
  const f = y0.fraction;

  // Hand-worked, 2026 annualized:
  //   Net self-employment = (58,000 - 4,000) + 6,000 = 60,000
  //   SE base = 60,000 x 92.35% = 55,410; SE tax = 55,410 x 15.3% = 8,477.73
  //   AGI = 60,000 - half SE tax (4,238.865) = 55,761.135
  //   Federal taxable = 55,761.135 - 16,100 = 39,661.135; tax = 1,240 + 12% x 27,261.135 = 4,511.34
  //   New Jersey on 55,761.135: 280 + 262.50 + 175 + 5.525% x 15,761.135 = 1,588.30
  //   Take-home = 60,000 - 8,477.73 - 4,511.34 - 1,588.30 = 45,422.63
  const seTax = 60000 * 0.9235 * 0.153;
  const agi = 60000 - seTax / 2;
  const fedTax = 1240 + 0.12 * (agi - 16100 - 12400);
  const njTax = 280 + 262.5 + 175 + 0.05525 * (agi - 40000);

  it("charges self-employment tax on 92.35% of net earnings and no FICA", () => {
    expect(y0.taxes.selfEmployment / f).toBeCloseTo(seTax, 2);
    expect(y0.taxes.fica).toBe(0);
  });

  it("deducts half the self-employment tax before income tax", () => {
    expect(y0.taxes.federalIncome / f).toBeCloseTo(fedTax, 2);
    expect(y0.taxes.state / f).toBeCloseTo(njTax, 2);
  });

  it("take-home nets business expenses, not just taxes", () => {
    expect(y0.income.gross / f).toBe(64000);
    expect(y0.takeHome / f).toBeCloseTo(60000 - seTax - fedTax - njTax, 2);
  });
});

describe("Dev: an income stream that ends at a set age (tutoring ends at 30)", () => {
  const r = run(householdFromExample(dev as ExampleHouseholdFile, asOf));

  it("includes the gig through age 29 and drops it from age 30", () => {
    // Side gig growth is 0% real in the likely band, so the gig stays 6,000; design grows 0% too.
    const at29 = r.rows.find((x) => x.age === 29)!;
    const at30 = r.rows.find((x) => x.age === 30)!;
    expect(at29.income.selfEmploymentNet).toBeCloseTo(54000 + 6000, 6);
    expect(at30.income.selfEmploymentNet).toBeCloseTo(54000, 6);
  });
});

describe("Dev: high-interest debt takes surplus before the Roth IRA", () => {
  const r = run(householdFromExample(dev as ExampleHouseholdFile, asOf));
  const y0 = r.rows[0]!;
  const f = y0.fraction;

  // Hand-worked, 2026 annualized:
  //   Take-home 45,422.63 - spending 30,000 - scheduled payments (card 2,400 + family 1,200) = gap 11,822.63
  //   Card at 26.9% is above the 8% threshold: extra up to payoff room = 6,800 - 2,400 = 4,400
  //   Remaining 7,422.63 goes to the Roth IRA (under the 7,500 limit). Nothing reaches taxable.
  const takeHome = 45422.63;
  const gap = takeHome - 30000 - 3600;

  it("steps: the card first, then the Roth IRA, nothing to taxable", () => {
    expect(y0.gap / f).toBeCloseTo(gap, 1);
    expect(y0.waterfall[0]!.step).toMatch(/High-interest debt: Credit card/);
    expect(y0.waterfall[0]!.amount / f).toBeCloseTo(4400, 1);
    expect(y0.waterfall[1]!.step).toBe("Roth IRA");
    expect(y0.waterfall[1]!.amount / f).toBeCloseTo(gap - 4400, 1);
    expect(y0.contributions["engine:brokerage"]).toBeUndefined();
  });

  it("the 0% family loan gets no extra, and the card is gone within two years", () => {
    expect(y0.debt.extra / f).toBeCloseTo(4400, 1);
    const paidOff = r.rows.find((x) => x.balances["card"] === 0)!;
    expect(paidOff.year).toBeLessThanOrEqual(2028);
    const mom = r.rows.find((x) => x.balances["mom"] === 0)!;
    expect(mom.year).toBeGreaterThan(paidOff.year);
  });
});

describe("Jordan: HSA contributions and limits, and a no-income-tax state", () => {
  const r = run(householdFromExample(jordan as ExampleHouseholdFile, asOf));
  const y0 = r.rows[0]!;
  const f = y0.fraction;

  it("Texas: no state income tax at all", () => {
    expect(y0.taxes.state).toBe(0);
    expect(r.rows.every((x) => x.taxes.state === 0)).toBe(true);
  });

  it("the entered HSA deduction (4,300) is under the 4,400 self-only limit and lands in the HSA account", () => {
    expect(y0.deductions.hsa / f).toBe(4300);
    expect(y0.contributions["hsa"]! / f).toBeCloseTo(4300, 6);
    // Pre-tax: 23,500 + 4,300 come off taxable income. Federal taxable = 115,000 - 27,800 - 16,100 = 71,100
    // tax = 5,800 + 22% x 20,700 = 10,354
    expect(y0.taxes.federalIncome / f).toBeCloseTo(10354, 2);
  });

  it("an HSA deduction above the limit is capped at the limit", () => {
    const h = householdFromExample(jordan as ExampleHouseholdFile, asOf);
    if (h.self.income.kind !== "rows") throw new Error("rows expected");
    const hsa = h.self.income.rows[0]!.preTaxDeductions!.find((d) => d.type === "hsa")!;
    hsa.annual = userValue(6000, asOf);
    const capped = run(h).rows[0]!;
    expect(capped.deductions.hsa / capped.fraction).toBe(4400);
  });

  it("max tax savings now tops the HSA up to the limit before the 401(k)", () => {
    const h = householdFromExample(jordan as ExampleHouseholdFile, asOf);
    h.savingsStrategy = userValue("maxTaxSavingsNow", asOf);
    const row = run(h).rows[0]!;
    expect(row.deductions.hsa / row.fraction).toBe(4400);
    expect(row.waterfall[0]!.step).toBe("3. HSA");
    expect(row.waterfall[0]!.amount / row.fraction).toBeCloseTo(100, 6);
    expect(row.waterfall[1]!.step).toBe("4. Traditional 401(k) to the limit");
    // 23,500 entered + 1,000 of room to the 24,500 limit
    expect(row.deductions.workplacePretax / row.fraction).toBeCloseTo(24500, 6);
  });
});
