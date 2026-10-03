import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { householdFromExample, type ExampleHouseholdFile } from "../model";
import { traceFiDate, traceNudges } from "./trace";

const asOf = "2026-10-02";
const h = () => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("traceNudges", () => {
  it("covers every income stream, spending, every account, returns, plan-to age, and Social Security", () => {
    const ids = traceNudges(h()).map((n) => n.inputId);
    expect(ids).toContain("income.job.grossAnnual");
    expect(ids).toContain("spending.total");
    expect(ids).toContain("accounts.k401.balance");
    expect(ids).toContain("accounts.loan.balance");
    expect(ids).toContain("assumptions.returns.stocks");
    expect(ids).toContain("assumptions.planToAge");
    expect(ids).toContain("socialSecurity.claimZero");
  });

  it("does not change the household it reads", () => {
    const original = h();
    const snapshot = JSON.stringify(original);
    traceFiDate(original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe("traceFiDate (Maya, likely)", () => {
  const trace = traceFiDate(h());
  const byId = Object.fromEntries(trace.entries.map((e) => [e.inputId, e]));

  it("reports the base FI age and one entry per input, ranked by effect", () => {
    expect(trace.fiAge).toBeGreaterThan(30);
    expect(trace.entries.length).toBeGreaterThanOrEqual(8);
    const sizes = trace.entries.map((e) => Math.abs(e.deltaYears ?? 99));
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });

  it("moves in the right direction for each input", () => {
    expect(byId["spending.total"]!.deltaYears).toBeGreaterThan(0);
    expect(byId["income.job.grossAnnual"]!.deltaYears).toBeLessThanOrEqual(0);
    expect(byId["assumptions.returns.stocks"]!.deltaYears).toBeGreaterThanOrEqual(0);
    expect(byId["assumptions.planToAge"]!.deltaYears).toBeGreaterThanOrEqual(0);
    expect(byId["socialSecurity.claimZero"]!.deltaYears).toBeGreaterThan(0);
  });

  it("explains what was tested in plain words", () => {
    expect(byId["spending.total"]!.label).toBe("Spending (10% more)");
    expect(byId["spending.total"]!.testedValue).toBe(Math.round(37200 * 1.1));
  });
});
