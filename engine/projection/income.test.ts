import { describe, expect, it } from "vitest";
import { defaultHouseholdAssumptions, resolveAssumptions, userValue, type IncomeStream } from "../model";
import { resolveBand } from "./bands";
import { incomeForYear, streamActive } from "./income";

const asOf = "2026-10-02";
const likely = resolveBand(resolveAssumptions(defaultHouseholdAssumptions()), "likely");
const best = resolveBand(resolveAssumptions(defaultHouseholdAssumptions()), "best");

const salary: IncomeStream = { id: "job", type: "salary", grossAnnual: userValue(72000, asOf), end: { kind: "retirement" } };
const gig: IncomeStream = { id: "tutoring", type: "sideGig", grossAnnual: userValue(6000, asOf), end: { kind: "age", age: 30 } };
const design: IncomeStream = {
  id: "design", type: "selfEmployed", grossAnnual: userValue(58000, asOf), businessExpensesAnnual: userValue(4000, asOf), end: { kind: "retirement" },
};

const ctx = (year: number, age: number, retirementYear = 2060) => ({ year, t: year - 2026, age, retirementYear });

describe("streamActive", () => {
  it("stops at retirement in the retirement year itself", () => {
    expect(streamActive(salary, ctx(2042, 41, 2043))).toBe(true);
    expect(streamActive(salary, ctx(2043, 42, 2043))).toBe(false);
  });

  it("stops at an age end once that age is reached", () => {
    expect(streamActive(gig, ctx(2031, 29))).toBe(true);
    expect(streamActive(gig, ctx(2032, 30))).toBe(false);
  });

  it("honors a start month and a date end", () => {
    const s: IncomeStream = { ...salary, start: "2028-01", end: { kind: "date", date: "2030-06" } };
    expect(streamActive(s, ctx(2027, 26))).toBe(false);
    expect(streamActive(s, ctx(2028, 27))).toBe(true);
    expect(streamActive(s, ctx(2030, 29))).toBe(false);
  });
});

describe("incomeForYear", () => {
  it("year 0 is the entered amount, split into wages", () => {
    const y = incomeForYear([salary], ctx(2026, 25), likely);
    expect(y.wages).toBe(72000);
    expect(y.grossTotal).toBe(72000);
    expect(y.selfEmploymentNet).toBe(0);
  });

  it("grows each stream by its type's real rate, compounding on years since year 0", () => {
    const y = incomeForYear([salary], ctx(2028, 27), likely);
    expect(y.wages).toBeCloseTo(72000 * 1.015 ** 2, 6);
    const b = incomeForYear([salary], ctx(2028, 27), best);
    expect(b.wages).toBeCloseTo(72000 * 1.03 ** 2, 6);
  });

  it("nets business expenses from self-employment and keeps the gig separate", () => {
    const y = incomeForYear([design, gig], ctx(2026, 24), likely);
    expect(y.selfEmploymentNet).toBe(54000 + 6000);
    expect(y.wages).toBe(0);
    expect(y.grossTotal).toBe(64000);
  });

  it("uses a per-stream growth override when present", () => {
    const s: IncomeStream = { ...salary, growth: userValue([0, 5, 10] as const, asOf) };
    expect(incomeForYear([s], ctx(2027, 26), likely).wages).toBeCloseTo(72000 * 1.05, 6);
    expect(incomeForYear([s], ctx(2027, 26), best).wages).toBeCloseTo(72000 * 1.1, 6);
  });
});
