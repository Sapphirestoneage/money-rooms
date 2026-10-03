/**
 * Start months for income and spending (data dictionary 2.6 and 3.4, convention C25),
 * with hand-worked examples. A row counts from its start month and through its end month.
 */

import { describe, expect, it } from "vitest";
import { defaultHouseholdAssumptions, loadLifePhases, resolveAssumptions, userValue, type IncomeStream, type SpendingRow } from "../model";
import { resolveBand } from "./bands";
import { incomeForYear, periodShare, streamShare } from "./income";
import { spendingForYear } from "./spending";

const asOf = "2026-10-03";
const likely = resolveBand(resolveAssumptions(defaultHouseholdAssumptions()), "likely");
const phases = loadLifePhases();

const stub = { year: 2026, t: 0, age: 25, retirementYear: 2060, fraction: 0.25, startMonth: 10 };
const y2027 = { year: 2027, t: 1, age: 26, retirementYear: 2060, fraction: 1, startMonth: 1 };
const y2028 = { year: 2028, t: 2, age: 27, retirementYear: 2060, fraction: 1, startMonth: 1 };

describe("periodShare", () => {
  it("is 1 with no dates, in a full year and in the stub", () => {
    expect(periodShare(undefined, undefined, y2027)).toBe(1);
    expect(periodShare(undefined, undefined, stub)).toBe(1);
  });

  it("counts from the start month", () => {
    expect(periodShare("2027-01", undefined, stub)).toBe(0);
    expect(periodShare("2027-01", undefined, y2027)).toBe(1);
    // July through December is 6 of 12 months.
    expect(periodShare("2027-07", undefined, y2027)).toBeCloseTo(6 / 12, 12);
    expect(periodShare("2027-07", undefined, y2028)).toBe(1);
    // Starting in December of the stub year: 1 of the stub's 3 months.
    expect(periodShare("2026-12", undefined, stub)).toBeCloseTo(1 / 3, 12);
  });

  it("combines a start and an end in the same year", () => {
    // March through August is 6 of 12 months.
    expect(periodShare("2027-03", "2027-08", y2027)).toBeCloseTo(6 / 12, 12);
  });
});

describe("income that has not started yet", () => {
  // A $50,000 contract starting January 2027.
  const contract: IncomeStream = { id: "c", type: "selfEmployed", grossAnnual: userValue(50000, asOf, "roughly"), start: "2027-01", end: { kind: "retirement" } };

  it("pays nothing in 2026 and a full year from 2027", () => {
    expect(streamShare(contract, stub)).toBe(0);
    expect(incomeForYear([contract], stub, likely).grossTotal).toBe(0);
    // Self-employed income does not grow in the likely band, so 2027 is 50,000.
    expect(incomeForYear([contract], y2027, likely).selfEmploymentNet).toBeCloseTo(50000, 6);
  });

  it("pays half a year when it starts in July", () => {
    const july: IncomeStream = { ...contract, start: "2027-07" };
    expect(incomeForYear([july], y2027, likely).selfEmploymentNet).toBeCloseTo(25000, 6);
    expect(incomeForYear([july], y2028, likely).selfEmploymentNet).toBeCloseTo(50000, 6);
  });
});

describe("spending that starts later", () => {
  // Health insurance of $800 a month ($9,600 a year) starting July 2027.
  const rows: SpendingRow[] = [
    { id: "housing", category: "accommodation", annual: userValue(12000, asOf, "roughly") },
    { id: "health", category: "healthcare", annual: userValue(9600, asOf, "roughly"), start: "2027-07" },
  ];

  it("is left out before it starts", () => {
    expect(spendingForYear(rows, stub, false, phases).total).toBe(12000);
  });

  it("counts six months in the year it starts, then the full amount", () => {
    expect(spendingForYear(rows, y2027, false, phases).total).toBeCloseTo(12000 + 4800, 6);
    expect(spendingForYear(rows, y2028, false, phases).total).toBeCloseTo(12000 + 9600, 6);
  });
});
