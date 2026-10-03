import { describe, expect, it } from "vitest";
import { loadTaxTables } from "../model";
import { computeFederalTax, computeSelfEmploymentTax } from "./federal";

const t = loadTaxTables(2026).federal;

const base = {
  filingStatus: "single" as const,
  wages: 0,
  pretaxPayrollDeductions: 0,
  selfEmploymentNet: 0,
  otherOrdinaryIncome: 0,
  earlyWithdrawals: 0,
};

describe("federal tax, 2026 single", () => {
  it("Maya: $72,000 salary with $2,880 of 401(k)", () => {
    const r = computeFederalTax({ ...base, wages: 72000, pretaxPayrollDeductions: 2880 }, t);
    expect(r.agi).toBe(69120);
    expect(r.taxableIncome).toBe(53020);
    expect(r.incomeTax).toBeCloseTo(6376.4, 2);
    expect(r.socialSecurityTax).toBeCloseTo(4464, 2);
    expect(r.medicareTax).toBeCloseTo(1044, 2);
    expect(r.additionalMedicareTax).toBe(0);
    expect(r.selfEmploymentTax).toBe(0);
    expect(r.marginalRate).toBe(22);
    expect(r.total).toBeCloseTo(6376.4 + 5508, 2);
  });

  it("owes no income tax under the standard deduction but still owes FICA", () => {
    const r = computeFederalTax({ ...base, wages: 15000 }, t);
    expect(r.taxableIncome).toBe(0);
    expect(r.incomeTax).toBe(0);
    expect(r.marginalRate).toBe(0);
    expect(r.total).toBeCloseTo(15000 * 0.0765, 6);
  });

  it("caps Social Security tax at the wage base and keeps Medicare uncapped", () => {
    const r = computeFederalTax({ ...base, wages: 300000 }, t);
    expect(r.socialSecurityTax).toBeCloseTo(184500 * 0.062, 6);
    expect(r.medicareTax).toBeCloseTo(300000 * 0.0145, 6);
    expect(r.additionalMedicareTax).toBeCloseTo(100000 * 0.009, 6);
  });

  it("taxes pretax withdrawals as ordinary income and adds the penalty when early", () => {
    const r = computeFederalTax({ ...base, otherOrdinaryIncome: 40000, earlyWithdrawals: 40000 }, t);
    expect(r.taxableIncome).toBe(40000 - 16100);
    expect(r.penalty).toBe(4000);
    expect(r.socialSecurityTax).toBe(0);
  });
});

describe("self-employment tax (Dev)", () => {
  it("applies 15.3% to 92.35% of net earnings and deducts half from AGI", () => {
    const se = computeSelfEmploymentTax(54000, 0, t);
    expect(se.base).toBeCloseTo(54000 * 0.9235, 6);
    expect(se.tax).toBeCloseTo(54000 * 0.9235 * 0.153, 6);
    const r = computeFederalTax({ ...base, selfEmploymentNet: 54000 }, t);
    expect(r.agi).toBeCloseTo(54000 - se.tax / 2, 6);
  });

  it("owes nothing under $400 of net earnings", () => {
    expect(computeSelfEmploymentTax(399, 0, t).tax).toBe(0);
  });

  it("coordinates the Social Security portion with wages already above the base", () => {
    const se = computeSelfEmploymentTax(50000, 184500, t);
    expect(se.tax).toBeCloseTo(50000 * 0.9235 * 0.029, 6);
  });
});
