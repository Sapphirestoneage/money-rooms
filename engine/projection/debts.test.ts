import { describe, expect, it } from "vitest";
import { debtFromPreset, userValue } from "../model";
import { debtYear, nominalRateFor, realRate } from "./debts";

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
    expect(r.endBalance).toBeCloseTo(24000 * (1 + rr) - 3120 * Math.sqrt(1 + rr), 6);
    expect(r.interest + r.principal).toBeCloseTo(r.paid, 9);
    expect(r.paidOff).toBe(false);
    expect(r.paymentBelowInterest).toBe(false);
  });

  it("the stub year prorates the payment and the growth", () => {
    const r = debtYear({ ...base, fraction: 0.25 });
    expect(r.paid).toBeCloseTo(780, 9);
    const rr = realRate(5.5, 3);
    expect(r.endBalance).toBeCloseTo(24000 * (1 + rr) ** 0.25 - 780 * (1 + rr) ** 0.125, 6);
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
