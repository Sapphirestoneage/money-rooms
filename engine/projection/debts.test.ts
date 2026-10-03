import { describe, expect, it } from "vitest";
import { debtFromPreset, userValue } from "../model";
import { debtYear, estimatedMinimumPaymentAnnual, nominalRateFor, realRate } from "./debts";

const asOf = "2026-10-02";

describe("realRate", () => {
  it("converts a nominal rate to real with the Fisher relation", () => {
    expect(realRate(5.5, 3)).toBeCloseTo(1.055 / 1.03 - 1, 12);
    expect(realRate(0, 3)).toBeCloseTo(1 / 1.03 - 1, 12);
    expect(realRate(3, 3)).toBeCloseTo(0, 12);
  });
});

describe("nominalRateFor", () => {
  it("uses the promo rate until the promo end month, then the rate after", () => {
    const card = debtFromPreset("creditCard", "c", userValue(5000, asOf), { rate: userValue(24, asOf), minimumPaymentAnnual: userValue(1200, asOf) });
    expect(nominalRateFor(card, 2030)).toBe(24);
    const promo = { ...card, promo: { rate: userValue(0, asOf), endDate: userValue("2028-06", asOf), rateAfter: userValue(24, asOf) } };
    expect(nominalRateFor(promo, 2027)).toBe(0);
    expect(nominalRateFor(promo, 2028)).toBe(24);
  });
});

describe("debtYear", () => {
  const base = { balance: 24000, nominalRatePercent: 5.5, nominalPaymentAnnual: 3120, inflationPercent: 3, t: 0, fraction: 1, extraPayment: 0 };

  it("a full year: interest accrues on the balance, the payment lands mid-year", () => {
    const r = debtYear(base);
    const rr = realRate(5.5, 3);
    expect(r.paid).toBeCloseTo(3120, 9);
    // Maya's loan: 24,000 x 1.02427 - 3,120 x (1 + 0.02427 / 2) = 21,424.6 (workpaper: 21,425)
    expect(r.endBalance).toBeCloseTo(24000 * (1 + rr) - 3120 * (1 + rr / 2), 6);
    expect(Math.round(r.endBalance)).toBe(21425);
    expect(r.interest + r.principal).toBeCloseTo(r.paid, 9);
    expect(r.paidOff).toBe(false);
    expect(r.paymentBelowInterest).toBe(false);
  });

  it("the stub year prorates the payment and the growth", () => {
    const r = debtYear({ ...base, fraction: 0.25 });
    expect(r.paid).toBeCloseTo(780, 9);
    const rr = realRate(5.5, 3);
    const period = (1 + rr) ** 0.25 - 1;
    expect(r.endBalance).toBeCloseTo(24000 * (1 + period) - 780 * (1 + period / 2), 6);
  });

  it("a fixed nominal payment shrinks in real terms over time", () => {
    const later = debtYear({ ...base, t: 10 });
    expect(later.scheduled).toBeCloseTo(3120 / 1.03 ** 10, 6);
  });

  it("never pays more than the payoff amount, and reports payoff", () => {
    const r = debtYear({ ...base, balance: 1000, extraPayment: 50000 });
    expect(r.endBalance).toBe(0);
    expect(r.paidOff).toBe(true);
    expect(r.paid).toBeLessThan(1100);
    expect(r.paid).toBeGreaterThan(1000);
  });

  it("flags a payment that does not cover interest", () => {
    const r = debtYear({ ...base, balance: 50000, nominalRatePercent: 26.9, nominalPaymentAnnual: 2400 });
    expect(r.paymentBelowInterest).toBe(true);
    expect(r.endBalance).toBeGreaterThan(50000);
  });

  it("a zero balance does nothing", () => {
    expect(debtYear({ ...base, balance: 0 })).toMatchObject({ paid: 0, endBalance: 0, paidOff: true });
  });
});

describe("estimatedMinimumPaymentAnnual", () => {
  it("is each month's interest plus 1% of the balance, annualized", () => {
    // 6,800 at 26.9%: interest 152.43 a month, plus 68 = 220.43 a month, 2,645.20 a year
    expect(estimatedMinimumPaymentAnnual(6800, 26.9)).toBeCloseTo(6800 * 0.269 + 6800 * 0.12, 6);
    // A 0% loan from family: 1% of 5,000 a month = 600 a year
    expect(estimatedMinimumPaymentAnnual(5000, 0)).toBeCloseTo(600, 6);
  });

  it("is zero for no balance", () => {
    expect(estimatedMinimumPaymentAnnual(0, 20)).toBe(0);
  });
});
