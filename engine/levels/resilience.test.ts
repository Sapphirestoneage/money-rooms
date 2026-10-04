import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { assetFromPreset, emptyHousehold, householdFromExample, userValue, type ExampleHouseholdFile, type Household } from "../model";
import { disabilityGap, gracefulPathMonths, mustPays, ruleOfFive, runway, shockTests, staircase, staircaseMonths, sturdiness, termLifeRange, unemploymentEstimate } from "./resilience";

const asOf = "2026-10-03";

/** The spec's worked example: 25 years old, $3,000 a month, $9,500 in cash. */
function example(stability?: "steady" | "normal" | "variable"): Household {
  const h = emptyHousehold(asOf);
  h.self.birthDate = userValue("2001-10", asOf);
  h.self.state = userValue("NY", asOf);
  h.self.income = { kind: "rows", rows: [{ id: "job", type: "salary", grossAnnual: userValue(60000, asOf), end: { kind: "retirement" } }] };
  h.spending = { kind: "rows", rows: [{ id: "s", category: "everythingElse", annual: userValue(36000, asOf) }] };
  h.accounts = { kind: "rows", rows: [assetFromPreset("savings", "sv", userValue(9500, asOf), asOf)] };
  if (stability) h.resilience = { incomeStability: userValue(stability, asOf) };
  return h;
}

describe("the Rule of 5 (acceptance test 1)", () => {
  it("matches the worked example: 5 months, $15,000, save $508 a month", () => {
    const r = ruleOfFive(example());
    expect(r.ageYears).toBe(25);
    expect(r.targetMonths).toBe(5);
    expect(r.targetDollars).toBe(15000);
    expect(r.gap).toBe(5500);
    expect(r.closeMonthly).toBeCloseTo(458.33, 1);
    expect(r.growthMonthly).toBeCloseTo(50, 6);
    expect(r.saveMonthly).toBeCloseTo(508.33, 1);
  });
  it("switching from variable to steady lowers the target by the multiplier difference (acceptance test 3)", () => {
    expect(ruleOfFive(example("variable")).targetMonths).toBeCloseTo(7.5, 9);
    expect(ruleOfFive(example("steady")).targetMonths).toBeCloseTo(4, 9);
  });
  it("once the target is met, the monthly number is the growth amount alone", () => {
    const h = example();
    if (h.accounts.kind === "rows") h.accounts.rows[0]!.balance = userValue(20000, asOf);
    expect(ruleOfFive(h).saveMonthly).toBeCloseTo(50, 6);
  });
});

describe("the staircase (acceptance test 2)", () => {
  it("steps add up and must-pays appear on every step below full", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const steps = staircase(h);
    expect(steps.map((s) => s.id)).toEqual(["full", "draftt", "fat", "foodHousing", "couch"]);
    expect(steps[0]!.mustPays).toEqual([]);
    for (const s of steps.slice(1)) expect(s.mustPays.length).toBe(mustPays(h).length);
    for (let i = 1; i < steps.length; i++) expect(steps[i]!.monthly).toBeLessThanOrEqual(steps[i - 1]!.monthly + 0.01);
    const m = staircaseMonths(h);
    const total = m[m.length - 1]!.months;
    expect(m.reduce((s, x) => s + x.added, 0)).toBeCloseTo(total, 6);
    expect(gracefulPathMonths(h)).toBeGreaterThan(m[0]!.months);
    expect(gracefulPathMonths(h)).toBeLessThanOrEqual(total + 0.01);
  });
});

describe("unemployment and the runway stack (acceptance tests 4 and 6)", () => {
  it("uses the placeholder table, says its source and that it is unverified, and W-2 income is eligible by default", () => {
    const u = unemploymentEstimate(example());
    expect(u.eligible).toBe(true);
    expect(u.weeklyBenefit).toBeCloseTo(Math.min(600, (60000 / 52) * 0.5), 6);
    expect(u.weeks).toBe(26);
    expect(u.source).toMatch(/Department of Labor/);
    expect(u.unverified).toBe(true);
  });
  it("retirement accounts never count as runway unless break glass is on", () => {
    const h = example();
    if (h.accounts.kind === "rows") h.accounts.rows.push(assetFromPreset("trad401k", "k", userValue(100000, asOf), asOf));
    const off = runway(h);
    expect(off.breakGlass.counted).toBe(false);
    expect(off.breakGlass.dollars).toBeCloseTo(100000 * 0.68, 6);
    expect(off.layers.map((l) => l.id)).toEqual(["cash", "cut", "unemployment", "severance", "investments"]);
    h.resilience = { breakGlass: userValue(true, asOf) };
    const on = runway(h);
    expect(on.totalMonths).toBeGreaterThan(off.totalMonths);
    expect(on.totalMonths - off.totalMonths).toBeCloseTo(off.breakGlass.months, 6);
  });
});

describe("disability, term life, and shocks (acceptance test 5)", () => {
  it("disability shows the gap it leaves and term life applies only with dependents", () => {
    const h = example();
    const d = disabilityGap(h);
    expect(d.unsure).toBe(true);
    expect(d.coveredMonthly).toBeCloseTo((60000 / 12) * 0.6, 6);
    expect(d.gapMonthly).toBe(0);
    expect(termLifeRange(h).applies).toBe(false);
    h.resilience = { dependents: userValue(1, asOf) };
    const t = termLifeRange(h);
    expect(t.applies).toBe(true);
    expect(t.low).toBe(36000 * 10);
  });
  it("each shock reports its effect on runway and on the FI date", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const shocks = shockTests(h);
    expect(shocks.map((s) => s.id)).toEqual(["jobLoss", "marketDrop", "medicalBill", "disability", "repair"]);
    for (const s of shocks) {
      expect(s.sentence).toMatch(/FI date|not fully funded/);
      expect(s.runwayMonthsAfter).toBeGreaterThanOrEqual(0);
    }
    const drop = shocks.find((s) => s.id === "marketDrop")!;
    expect(drop.fiDeltaYears).toBeGreaterThanOrEqual(0);
  });
  it("the sturdiness headline reads runway at full and through the staircase", () => {
    const s = sturdiness(householdFromExample(maya as ExampleHouseholdFile, asOf));
    expect(s.headline).toMatch(/^Zombie readiness: \d+ months\. At full spending you'd last \d+\. Cutting back gets you to \d+\.$/);
    expect(s.staircaseTotalMonths).toBeGreaterThanOrEqual(s.fullMonths);
  });
});
