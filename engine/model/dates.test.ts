import { describe, expect, it } from "vitest";
import {
  ageAtYearEnd,
  ageInYears,
  isIsoDate,
  isYearMonth,
  monthsBetween,
  parseYearMonth,
  stubFraction,
  yearMonthOf,
} from "./dates";

describe("date formats", () => {
  it("recognizes YYYY-MM", () => {
    expect(isYearMonth("2001-03")).toBe(true);
    expect(isYearMonth("2001-13")).toBe(false);
    expect(isYearMonth("2001-3")).toBe(false);
    expect(isYearMonth("2001-03-01")).toBe(false);
  });

  it("recognizes YYYY-MM-DD", () => {
    expect(isIsoDate("2026-10-02")).toBe(true);
    expect(isIsoDate("2026-10")).toBe(false);
    expect(isIsoDate("2026-10-32")).toBe(false);
  });

  it("parses and trims", () => {
    expect(parseYearMonth("2001-03")).toEqual({ year: 2001, month: 3 });
    expect(yearMonthOf("2026-10-02")).toBe("2026-10");
    expect(() => parseYearMonth("nope")).toThrow();
  });
});

describe("ages", () => {
  it("counts whole months", () => {
    expect(monthsBetween("2001-03", "2026-10")).toBe(307);
    expect(monthsBetween("2026-10", "2026-10")).toBe(0);
    expect(monthsBetween("2026-10", "2026-09")).toBe(-1);
  });

  it("computes age in whole years, birthday month included", () => {
    expect(ageInYears("2001-03", "2026-02")).toBe(24);
    expect(ageInYears("2001-03", "2026-03")).toBe(25);
    expect(ageInYears("2001-03", "2026-10")).toBe(25);
  });

  it("computes age at year end for the annual loop", () => {
    // Maya, born March 2001: 25 at the end of 2026, 26 at the end of 2027.
    expect(ageAtYearEnd("2001-03", 2026)).toBe(25);
    expect(ageAtYearEnd("2001-03", 2027)).toBe(26);
    // Jordan, born August 1998: 28 at the end of 2026.
    expect(ageAtYearEnd("1998-08", 2026)).toBe(28);
  });
});

describe("stub fraction (decision E8)", () => {
  it("counts the as-of month in full", () => {
    expect(stubFraction("2026-10-02")).toBeCloseTo(3 / 12);
    expect(stubFraction("2026-01-15")).toBe(1);
    expect(stubFraction("2026-12-31")).toBeCloseTo(1 / 12);
  });
});
