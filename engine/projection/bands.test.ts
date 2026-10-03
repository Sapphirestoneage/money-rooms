import { describe, expect, it } from "vitest";
import { defaultHouseholdAssumptions, resolveAssumptions } from "../model";
import { resolveBand } from "./bands";

const resolved = resolveAssumptions(defaultHouseholdAssumptions());

describe("resolveBand", () => {
  it("likely takes the middle of every band", () => {
    const b = resolveBand(resolved, "likely");
    expect(b.returns).toEqual({ stocks: 6.5, bonds: 2, cash: 0.5 });
    expect(b.inflation).toBe(3);
    expect(b.incomeGrowth.salary).toBe(1.5);
    expect(b.socialSecurityPolicy).toBe(1);
    expect(b.planToAge).toBe(95);
    expect(b.phases).toHaveLength(3);
  });

  it("best takes high returns, low inflation, high income growth, full Social Security", () => {
    const b = resolveBand(resolved, "best");
    expect(b.returns.stocks).toBe(8.5);
    expect(b.inflation).toBe(2);
    expect(b.incomeGrowth.salary).toBe(3);
    expect(b.socialSecurityPolicy).toBe(1);
  });

  it("worst takes low returns, high inflation, low income growth, the Social Security floor", () => {
    const b = resolveBand(resolved, "worst");
    expect(b.returns.stocks).toBe(4);
    expect(b.returns.cash).toBe(-1);
    expect(b.inflation).toBe(4);
    expect(b.incomeGrowth.salary).toBe(0);
    expect(b.socialSecurityPolicy).toBe(0.78);
  });
});
