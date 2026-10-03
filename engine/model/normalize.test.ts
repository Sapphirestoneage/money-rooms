import { describe, expect, it } from "vitest";
import { annualFrom, annualFromMonthly, fromAnnual } from "./normalize";

describe("annual normalization (2.4)", () => {
  it("passes annual through", () => {
    expect(annualFrom(72000, "year")).toBe(72000);
  });

  it("multiplies monthly by 12", () => {
    expect(annualFrom(4120, "month")).toBe(49440);
    expect(annualFromMonthly(260)).toBe(3120);
  });

  it("uses the pay frequency for paychecks", () => {
    expect(annualFrom(1000, "paycheck", { payFrequency: "weekly" })).toBe(52000);
    expect(annualFrom(1000, "paycheck", { payFrequency: "biweekly" })).toBe(26000);
    expect(annualFrom(1000, "paycheck", { payFrequency: "semimonthly" })).toBe(24000);
    expect(annualFrom(1000, "paycheck", { payFrequency: "monthly" })).toBe(12000);
  });

  it("multiplies weekly by 52", () => {
    expect(annualFrom(504, "week")).toBe(26208);
    expect(fromAnnual(26208, "week")).toBe(504);
  });

  it("uses hours per week for hourly", () => {
    expect(annualFrom(20, "hour", { hoursPerWeek: 40 })).toBe(41600);
  });

  it("refuses to guess missing context", () => {
    expect(() => annualFrom(1000, "paycheck")).toThrow();
    expect(() => annualFrom(20, "hour")).toThrow();
  });

  it("reverses for display", () => {
    expect(fromAnnual(49440, "month")).toBe(4120);
    expect(fromAnnual(26000, "paycheck", { payFrequency: "biweekly" })).toBe(1000);
  });
});
