import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { householdFromExample, type ExampleHouseholdFile } from "../model";
import { defaultDeps, runFor } from "../projection/fi";
import { requireComplete } from "../projection/timeline";
import { resolveAssumptions } from "../model";
import { resolveBand } from "../projection/bands";
import { defaultPolicy } from "../projection/policy";
import { drawdownUnlockItems, fiNumbers } from "./fi-numbers";
import { estateAfterHeirsTaxes, scoreResult } from "./objectives";
import { planSteps, planText, strategiesUsed } from "./plan";
import { knobValues, optimize } from "./search";
import { strategyToggles, stressTest, tripwireFlags } from "./toggles";

const asOf = "2026-10-03";
const mayaHousehold = () => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("objectives", () => {
  it("the estate after heirs' taxes discounts pretax money at the heir rate and leaves Roth, taxable, and cash whole", () => {
    const h = mayaHousehold();
    const t = runFor(requireComplete(h), resolveBand(resolveAssumptions(h.assumptions), "likely"), defaultDeps(), 2045);
    const last = t.rows[t.rows.length - 1]!;
    const pretax = t.accounts.filter((a) => a.kind === "asset" && (a.taxBucket === "pretax" || a.taxBucket === "hsa")).reduce((s, a) => s + (last.balances[a.id] ?? 0), 0);
    expect(estateAfterHeirsTaxes(t, 22)).toBeCloseTo(last.netWorth - 0.22 * pretax, 3);
    expect(estateAfterHeirsTaxes(t, 0)).toBeCloseTo(last.netWorth, 3);
  });

  it("a plan that is not funded or breaks the estate floor scores minus infinity", () => {
    const h = mayaHousehold();
    const t = runFor(requireComplete(h), resolveBand(resolveAssumptions(h.assumptions), "likely"), defaultDeps(), 2030);
    const r = { band: "likely" as const, funded: false, retirementYear: 2030, fiAge: 29, timeline: t, oneYearEarlier: null, neverFundedShortfall: t.firstShortfall };
    expect(scoreResult("earliestFi", r, defaultPolicy().limits, 22).score).toBe(-Infinity);
    const ok = runFor(requireComplete(h), resolveBand(resolveAssumptions(h.assumptions), "likely"), defaultDeps(), 2050);
    const rr = { ...r, funded: true, retirementYear: 2050, timeline: ok };
    expect(scoreResult("biggestEstate", rr, { ...defaultPolicy().limits, estateFloor: 1e12 }, 22).score).toBe(-Infinity);
    expect(scoreResult("biggestEstate", rr, defaultPolicy().limits, 22).score).toBeGreaterThan(0);
  });
});

describe("the knob search", () => {
  it("only offers knobs that can apply: no rule of 55 without a plan that allows it, no contribution type without a workplace contribution", () => {
    const hh = requireComplete(mayaHousehold());
    expect(knobValues(hh, "ruleOf55")).toEqual([false]);
    expect(knobValues(hh, "contributionType").length).toBe(4);
    expect(knobValues(hh, "claimingAge").length).toBe(9);
  });

  it("earliest FI: the best plan is never later than the baseline, and the search runs in well under a thousand projections", () => {
    const r = optimize(mayaHousehold(), { objective: "earliestFi" });
    expect(r.best.result.funded).toBe(true);
    expect(r.best.result.retirementYear!).toBeLessThanOrEqual(r.baseline.result.retirementYear!);
    expect(r.evaluations).toBeLessThan(1000);
    expect(r.retirementYear).toBeNull();
  });

  it("least lifetime tax: holds the retirement year fixed and finds lower taxes than the baseline", () => {
    const r = optimize(mayaHousehold(), { objective: "leastLifetimeTax" });
    expect(r.retirementYear).toBe(r.baseline.result.retirementYear);
    expect(r.best.result.timeline.lifetimeTaxes).toBeLessThan(r.baseline.result.timeline.lifetimeTaxes);
    expect(r.best.policy.conversionTarget).not.toBe("none");
  });

  it("biggest estate: never smaller than the baseline, and never funded plans are never chosen", () => {
    const r = optimize(mayaHousehold(), { objective: "biggestEstate" });
    expect(r.best.headline).toBeGreaterThanOrEqual(r.baseline.headline);
    expect(r.best.result.funded).toBe(true);
  });

  it("most spending: reports a sustainable annual spending above what is entered for a plan with room", () => {
    const r = optimize(mayaHousehold(), { objective: "mostSpending", retirementYear: 2046 });
    expect(r.best.sustainableSpending!).toBeGreaterThan(37200);
    expect(r.best.result.funded).toBe(true);
  });

  it("an estate floor is respected", () => {
    const r = optimize(mayaHousehold(), { objective: "earliestFi", limits: { estateFloor: 1_000_000 } });
    expect(estateAfterHeirsTaxes(r.best.result.timeline, 22)).toBeGreaterThanOrEqual(1_000_000);
  });

  it("locks are planned around: a locked conversion year keeps its amount in the winning plan", () => {
    const r = optimize(mayaHousehold(), { objective: "leastLifetimeTax", locks: { 2050: { conversion: 12345 } } });
    const row = r.best.result.timeline.rows.find((x) => x.year === 2050)!;
    expect(row.m2!.conversion).toBeCloseTo(12345, 0);
    expect(r.best.policy.locks[2050]?.conversion).toBe(12345);
  });
});

describe("the plan in words", () => {
  it("groups years that look alike and describes what the numbers show without instructing", () => {
    const r = optimize(mayaHousehold(), { objective: "leastLifetimeTax" });
    const steps = planSteps(r.best.result.timeline, r.best.policy);
    expect(steps.length).toBeGreaterThan(2);
    expect(steps[0]!.lines[0]).toBe("Work income continues and savings follow the plan as entered.");
    const text = planText(r.best.result.timeline, r.best.policy).join("\n");
    expect(text).toMatch(/^Ages 25 to \d+: Work income continues and savings follow the plan as entered\./);
    expect(text).toMatch(/About \$[\d,]+ a year moves from .* to Roth as a conversion/);
    expect(text).not.toMatch(/\byou should\b/i);
    expect(strategiesUsed(r.best.policy, r.best.result.timeline)).toContain("Roth conversion ladder");
  });
});

describe("FI number vs True FI number", () => {
  it("gross is 25 times spending; net is assets at the optimized date; the difference is in dollars and years", () => {
    const h = mayaHousehold();
    const r = optimize(h, { objective: "earliestFi" });
    const working = runFor(requireComplete(h), resolveBand(resolveAssumptions(h.assumptions), "likely"), defaultDeps(), Infinity);
    const n = fiNumbers(h, r, working);
    expect(n.grossFi).toBe(25 * 37200);
    expect(n.netFi).toBe(r.best.result.timeline.assetsAtRetirement);
    expect(n.differenceDollars).toBeCloseTo(n.netFi! - n.grossFi, 6);
    expect(n.grossFiYear).toBeGreaterThan(2026);
    expect(n.differenceYears).toBe(n.grossFiYear! - n.netFiYear!);
  });

  it("the unlock lists the drawdown inputs still missing, and roughly counts as answered", () => {
    const h = mayaHousehold();
    const before = drawdownUnlockItems(h);
    expect(before.map((i) => i.id)).toEqual(expect.arrayContaining(["drawdown.heirTaxRatePercent", "drawdown.acaHouseholdSize", "plan.ruleOf55Allowed"]));
    h.drawdown = { heirTaxRatePercent: { value: 22, asOf, source: "user", confidence: "roughly" }, acaHouseholdSize: { value: 1, asOf, source: "user", confidence: "known" }, medicaidExpansionState: { value: true, asOf, source: "user", confidence: "roughly" } };
    const after = drawdownUnlockItems(h);
    expect(after.map((i) => i.id)).not.toContain("drawdown.heirTaxRatePercent");
    expect(after.length).toBeLessThan(before.length);
  });
});

describe("toggles, tripwires, and the stress test", () => {
  it("each strategy in the best plan reports what turning it off does, in years and dollars", () => {
    const h = mayaHousehold();
    const r = optimize(h, { objective: "leastLifetimeTax" });
    const toggles = strategyToggles(h, r.best.policy);
    const on = toggles.filter((t) => t.on);
    expect(on.length).toBeGreaterThan(0);
    const conversions = toggles.find((t) => t.id === "conversions")!;
    expect(conversions.on).toBe(true);
    expect(conversions.deltaLifetimeTaxesOff).toBeGreaterThan(0);
    for (const t of toggles.filter((x) => !x.on)) expect(t.deltaYearsOff).toBeNull();
  });

  it("tripwire flags name the sunsetting and watched rules in plain sentences", () => {
    const r = optimize(mayaHousehold(), { objective: "earliestFi" });
    const flags = tripwireFlags(r.best.result);
    expect(flags.map((f) => f.ruleId)).toContain("health.acaPtc.2026");
    for (const f of flags) expect(f.sentence).toMatch(/^Your plan uses the .+, which (is scheduled to end after \d{4}|is under watch)/);
  });

  it("the stress test reruns the plan with the sunsets gone, Social Security at its floor, and the worst band", () => {
    const h = mayaHousehold();
    const r = optimize(h, { objective: "earliestFi" });
    const cases = stressTest(h, r.best.policy);
    expect(cases.map((c) => c.id)).toEqual(["sunsets", "socialSecurityFloor", "worstBand"]);
    const floor = cases.find((c) => c.id === "socialSecurityFloor")!;
    expect(floor.deltaEstate).toBeGreaterThan(0);
    expect(floor.deltaYears).toBeGreaterThanOrEqual(0);
    expect(cases.find((c) => c.id === "worstBand")!.deltaYears).toBeGreaterThan(0);
  });
});
