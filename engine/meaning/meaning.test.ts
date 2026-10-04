import { describe, expect, it } from "vitest";
import dev from "../../tests/households/dev.json";
import jordan from "../../tests/households/jordan.json";
import maya from "../../tests/households/maya.json";
import { householdFromExample, type ExampleHouseholdFile, type Household } from "../model";
import { adviceTranslator } from "./advice";
import { drafttLens, fourPercentLens, hoursLens, simpleMathLens, taxesLens, yearsToFiFromSavingsRate } from "./lenses";
import { loadRatios, ratioInputs, ratios } from "./ratios";

const asOf = "2026-10-03";
const load = (f: unknown): Household => householdFromExample(f as ExampleHouseholdFile, asOf);
const INSTRUCTS = /\b(you should|you must|you need to)\b/i;

describe("the ratio registry (acceptance tests 1 to 3)", () => {
  it("every ratio has a formula, inputs, a unit, an unlock level, and a sentence", () => {
    for (const r of loadRatios()) {
      expect(r.formula.length).toBeGreaterThan(10);
      expect(r.inputs.length).toBeGreaterThan(0);
      expect(["percent", "years", "months", "ratio", "dollars", "hours"]).toContain(r.unit);
      expect(r.unlockLevel).toBeGreaterThanOrEqual(1);
      expect(r.sentence).toContain("{value}");
    }
  });

  it("computes every ratio for the three example households without error", () => {
    for (const f of [maya, jordan, dev]) {
      const list = ratios(load(f), [1, 2, 3, 4, 5]);
      expect(list.length).toBe(loadRatios().length);
      for (const r of list) expect(typeof r.text).toBe("string");
    }
  });

  it("the savings rate is saving over take-home pay in Maya's first full year (test 2)", () => {
    const h = load(maya);
    const i = ratioInputs(h);
    const rate = ratios(h, [1]).find((r) => r.id === "savingsRate")!;
    expect(rate.value).toBeCloseTo((i.year1!.contributions / i.year1!.takeHome) * 100, 6);
    expect(rate.text).toMatch(/^You save \d+% of your take-home pay\./);
    expect(rate.locked).toBe(false);
  });

  it("a ratio whose level is not passed is locked, and shows when asked (test 3)", () => {
    const h = load(maya);
    const locked = ratios(h, [1]).find((r) => r.id === "debtToIncome")!;
    expect(locked.locked).toBe(true);
    expect(locked.value).toBeNull();
    expect(locked.text).toBe("Unlocks with Level 2.");
    const asked = ratios(h, [1], { includeLocked: true }).find((r) => r.id === "debtToIncome")!;
    expect(asked.value).not.toBeNull();
    const passed = ratios(h, [1, 2]).find((r) => r.id === "debtToIncome")!;
    expect(passed.locked).toBe(false);
    expect(passed.band).not.toBeNull();
  });
});

describe("lenses (acceptance tests 4 to 6)", () => {
  it("the 4% rule lens shows Gross FI, the year assets reach it, Net FI, and the difference, equal to M2's numbers", () => {
    const l = fourPercentLens(load(maya));
    expect(l.grossFi).toBe(25 * 37200);
    expect(l.netFi).not.toBeNull();
    expect(l.differenceDollars).toBeCloseTo(l.netFi! - l.grossFi, 6);
    expect(l.grossFiYear).toBeGreaterThan(2026);
    expect(l.sentence).toMatch(/^The 4% rule says you need \$930,000\./);
  });

  it("shockingly simple math: the table matches the formula and the comparison names the plan's own years", () => {
    // At 50% savings, 5% real, 4% withdrawal: target 12.5 years of spending; about 16.6 years.
    expect(yearsToFiFromSavingsRate(50, 5, 4)).toBeCloseTo(Math.log(1 + (12.5 * 0.05) / 0.5) / Math.log(1.05), 6);
    expect(yearsToFiFromSavingsRate(100, 5, 4)).toBe(0);
    expect(yearsToFiFromSavingsRate(0, 5, 4)).toBeNull();
    const l = simpleMathLens(load(maya));
    expect(l.table.length).toBe(11);
    expect(l.yearsFromTable).toBeGreaterThan(0);
    expect(l.sentence).toMatch(/the table says about \d+ years to FI from zero\. Your plan.*says (\d+ years|it is not fully funded)/);
    expect(l.source).toMatch(/Shockingly Simple Math/);
  });

  it("the DRAFTT scorecard shows shares of take-home that add to at most 100%, with therapy and taxes switchable", () => {
    const h = load(maya);
    const base = drafttLens(h);
    expect(base.letters.map((l) => l.id)).toEqual(["D", "R", "A", "F", "T1"]);
    expect(base.totalPercent).toBeLessThanOrEqual(100);
    for (const l of base.letters) expect(l.sharePercent).toBeGreaterThanOrEqual(0);
    const withTaxes = drafttLens(h, { therapy: false, taxes: true });
    expect(withTaxes.letters.map((l) => l.id)).toEqual(["D", "R", "A", "F", "T2"]);
    expect(withTaxes.letters.find((l) => l.id === "T2")!.sharePercent).toBeGreaterThan(5);
  });

  it("the hours and taxes lenses read the engine", () => {
    const h = load(maya);
    const hours = hoursLens(h);
    expect(hours.hourlyWage).toBeGreaterThan(15);
    expect(hours.lines[0]!.hours).toBeGreaterThanOrEqual(hours.lines[hours.lines.length - 1]!.hours);
    const taxes = taxesLens(h);
    expect(taxes.lifetimeTaxes).toBeGreaterThan(0);
    expect(taxes.effectiveRateNow).toBeGreaterThan(10);
    expect(taxes.taxEfficiencyPercent).toBeGreaterThan(0);
  });
});

describe("the Advice Translator (acceptance tests 7 and 8)", () => {
  it("every line gets a verdict and a sentence with numbers, and early access reads unlearn for a household with a Roth IRA", () => {
    const h = load(maya);
    const list = adviceTranslator(h);
    expect(list.length).toBe(10);
    for (const a of list) {
      expect(["applies", "partly", "unlearn"]).toContain(a.verdict);
      expect(a.sentence.length).toBeGreaterThan(20);
    }
    expect(list.find((a) => a.id === "neverTouch")!.verdict).toBe("unlearn");
    expect(list.find((a) => a.id === "threeToSix")!.sentence).toMatch(/Rule of 5 target is [\d.]+ months/);
    const devList = adviceTranslator(load(dev));
    expect(devList.find((a) => a.id === "debtFirst")!.verdict).toBe("partly");
    expect(devList.find((a) => a.id === "debtFirst")!.sentence).toMatch(/above 8%/);
  });

  it("no sentence in M4 instructs", () => {
    const h = load(maya);
    const texts = [...adviceTranslator(h).map((a) => a.sentence), ...ratios(h, [1, 2, 3, 4, 5]).map((r) => r.text), simpleMathLens(h).sentence, fourPercentLens(h).sentence];
    for (const t of texts) expect(t).not.toMatch(INSTRUCTS);
  });
});
