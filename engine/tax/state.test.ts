import { describe, expect, it } from "vitest";
import { loadTaxTables } from "../model";
import { computeStateTax } from "./state";

const tables = loadTaxTables(2026);

describe("state tax, 2026", () => {
  it("New York, Maya: $69,120 of income after her 401(k)", () => {
    const r = computeStateTax(69120, "NY", "single", tables);
    expect(r.taxableIncome).toBe(61120);
    // 3.9% of 8,500 + 4.4% of 3,200 + 5.15% of 2,200 + 5.4% of 47,220
    expect(r.tax).toBeCloseTo(331.5 + 140.8 + 113.3 + 2549.88, 2);
    expect(r.marginalRate).toBe(5.4);
  });

  it("Texas, Jordan: nothing", () => {
    expect(computeStateTax(115000, "TX", "single", tables)).toEqual({ taxableIncome: 0, tax: 0, marginalRate: 0, local: 0 });
  });

  it("New Jersey, Dev: no standard deduction, graduated brackets", () => {
    const r = computeStateTax(50000, "NJ", "single", tables);
    expect(r.taxableIncome).toBe(50000);
    // 1.4% of 20,000 + 1.75% of 15,000 + 3.5% of 5,000 + 5.525% of 10,000
    expect(r.tax).toBeCloseTo(280 + 262.5 + 175 + 552.5, 2);
  });

  it("flat and floor states", () => {
    expect(computeStateTax(100000, "PA", "single", tables).tax).toBeCloseTo(3070, 6);
    expect(computeStateTax(26050, "OH", "single", tables).tax).toBe(0);
  });

  it("married filers read the joint column", () => {
    const r = computeStateTax(69120, "NY", "marriedJoint", tables);
    expect(r.taxableIncome).toBe(69120 - 16050);
  });

  it("Pennsylvania (rule state.PA.compensation): 401(k) deferrals and the half-SE deduction are added back, and the local earned income tax is a separate line", () => {
    // Rosa: federal AGI $71,570 (wages $64,600 after the $3,400 deferral, $7,500 of net profit, less $530 of half-SE tax).
    const r = computeStateTax(71570, "PA", "headOfHousehold", tables, { addBack: 3400 + 530, localTaxPercent: 1, localBase: 68000 + 7500 });
    expect(r.taxableIncome).toBe(75500);
    expect(r.tax).toBeCloseTo(2317.85, 2);
    expect(r.local).toBeCloseTo(755, 2);
  });
});
