import { describe, expect, it } from "vitest";
import { loadSocialSecurityParams } from "../model";
import {
  annualBenefit,
  averageIndexedMonthlyEarnings,
  claimingFactor,
  estimateEarningsRecord,
  primaryInsuranceAmount,
} from "./benefit";

const p = loadSocialSecurityParams(2026);

describe("average indexed monthly earnings", () => {
  it("averages the top 35 years over 420 months", () => {
    const years = Array(40).fill(72000);
    expect(averageIndexedMonthlyEarnings(years, p)).toBeCloseTo(6000, 6);
  });

  it("counts missing years as zero when there are fewer than 35", () => {
    const years = Array(20).fill(72000);
    expect(averageIndexedMonthlyEarnings(years, p)).toBeCloseTo((72000 * 20) / 420, 6);
  });

  it("keeps the highest years when there are more than 35", () => {
    const years = [...Array(35).fill(100000), ...Array(10).fill(10000)];
    expect(averageIndexedMonthlyEarnings(years, p)).toBeCloseTo(100000 / 12, 6);
  });
});

describe("primary insurance amount (2026 bend points)", () => {
  it("applies 90%, 32%, and 15% and rounds down to a dime", () => {
    // 90% of 1,286 = 1,157.40; 32% of 3,714 = 1,188.48; sum 2,345.88 -> 2,345.80
    expect(primaryInsuranceAmount(5000, p)).toBeCloseTo(2345.8, 6);
  });

  it("stays in the first segment for low earnings", () => {
    expect(primaryInsuranceAmount(1000, p)).toBeCloseTo(900, 6);
  });

  it("uses the third segment above the second bend point", () => {
    // 1,157.40 + 32% of 6,463 (2,068.16) + 15% of 2,251 (337.65) = 3,563.21 -> 3,563.20
    expect(primaryInsuranceAmount(10000, p)).toBeCloseTo(3563.2, 6);
  });

  it("is zero for no earnings", () => {
    expect(primaryInsuranceAmount(0, p)).toBe(0);
  });
});

describe("claiming factor", () => {
  it("is 1 at full retirement age", () => {
    expect(claimingFactor(2001, { years: 67, months: 0 }, p)).toBe(1);
    expect(claimingFactor(1957, { years: 66, months: 6 }, p)).toBe(1);
  });

  it("is 70% at 62 for a 67 full retirement age", () => {
    expect(claimingFactor(2001, { years: 62, months: 0 }, p)).toBeCloseTo(0.7, 9);
  });

  it("is 80% at 64 (36 months early at 5/9 of 1%)", () => {
    expect(claimingFactor(2001, { years: 64, months: 0 }, p)).toBeCloseTo(0.8, 9);
  });

  it("is 124% at 70 for a 67 full retirement age", () => {
    expect(claimingFactor(2001, { years: 70, months: 0 }, p)).toBeCloseTo(1.24, 9);
  });

  it("stops crediting after 70 and refuses claims before 62", () => {
    expect(claimingFactor(2001, { years: 72, months: 0 }, p)).toBeCloseTo(1.24, 9);
    expect(claimingFactor(2001, { years: 60, months: 0 }, p)).toBeCloseTo(0.7, 9);
  });
});

describe("annual benefit and the earnings record estimate", () => {
  it("multiplies PIA, factor, twelve months, and the policy band", () => {
    expect(annualBenefit(2000, 1, 1)).toBe(24000);
    expect(annualBenefit(2000, 0.7, 0.78)).toBeCloseTo(2000 * 0.7 * 12 * 0.78, 9);
  });

  it("back-fills past years at the assumed amount and appends projected years", () => {
    // Maya, born 2001, assumed working from 22 (2023): three back-filled years before 2026.
    const record = estimateEarningsRecord({
      projected: { 2026: 72000, 2027: 73080 },
      birthYear: 2001,
      firstProjectionYear: 2026,
      assumedPastAnnual: 72000,
      startAge: 22,
    });
    expect(record).toEqual([72000, 72000, 72000, 72000, 73080]);
  });
});
